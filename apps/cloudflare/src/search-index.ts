import {
  type SearchItem,
  type SearchableVersion,
  type Synonyms,
  encodeIndex,
  isSearchableVersion,
  searchableVersions,
  words,
} from '@auctionoton/search';
import type { Region } from './contracts';
import { CsvParser } from './csv';
import { publicDataOrigin, realmCatalog } from './realms';

// Builds the per Game version item search indexes (docs/adr/0001-in-browser-item-search.md) and
// runs the Realm sweep that decides which items are Observed items.

export { SWEEP_CRON } from './sweep-schedule';
export const SEARCH_GRACE_DAYS = 30;
/** Superseded index files stay this long so pages rendered before a rebuild can still load. */
const SUPERSEDED_INDEX_MS = 86_400_000;
const DAY_MS = 86_400_000;
export const searchIndexKey = (version: string, hash: string) =>
  `search-index/${version}/${hash}.json`;
export const SEARCH_INDEX_CACHE_CONTROL = 'public, max-age=31536000, immutable';

type Database = Pick<D1Database, 'prepare' | 'batch'>;
export type SearchIndexEnv = {
  MARKET: Database;
  SEARCH_INDEXES: Pick<R2Bucket, 'put' | 'list' | 'delete'>;
};

// --- Realm sweep ---

export type SweepRealm = {
  version: SearchableVersion;
  region: Region;
  slug: string;
  urls: string[];
};

/** Every catalog realm of a Game version, with one public price list per faction house. */
export function sweepRealms(version: SearchableVersion, catalog = realmCatalog): SweepRealm[] {
  return Object.entries(catalog[version] ?? {}).flatMap(([region, entry]) =>
    entry.realms.map((realm) => ({
      version,
      region: region as Region,
      slug: realm.slug,
      urls: realm.auctionHouses.map(
        (house) =>
          `${publicDataOrigin}/${entry.path}/realm/${realm.slug}-${house.type.toLowerCase()}/items.csv`,
      ),
    })),
  );
}

/**
 * The item ids listed on a realm's auction houses, or null when none of its price lists exist.
 * Other failures throw so the Workflow step retries them.
 */
export async function observeRealm(realm: SweepRealm, fetcher: typeof fetch = fetch) {
  const ids = new Set<number>();
  let found = 0;
  for (const url of realm.urls) {
    const response = await fetcher(url, { signal: AbortSignal.timeout(60_000) });
    if (response.status === 404) {
      await response.body?.cancel();
      continue;
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error(`Price list ${url} failed: ${response.status}`);
    }
    found++;
    const parser = new CsvParser();
    let column = -1;
    const collect = (rows: string[][]) => {
      for (const row of rows) {
        if (column < 0) {
          column = row.indexOf('itemId');
          if (column < 0) throw new Error(`Price list ${url} has no itemId column`);
          continue;
        }
        const id = Number(row[column]);
        if (Number.isSafeInteger(id) && id > 0) ids.add(id);
      }
    };
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    for (let read = await reader.read(); !read.done; read = await reader.read())
      collect(parser.write(decoder.decode(read.value, { stream: true })));
    collect(parser.write(decoder.decode()));
    collect(parser.end());
  }
  return found ? [...ids].sort((a, b) => a - b) : null;
}

/**
 * Replaces a Game version's observations with one sweep's results. A sweep that could not read
 * most realms is recorded as failed and leaves the previous observations in force.
 */
export async function recordSweep(
  db: Database,
  version: SearchableVersion,
  id: string,
  startedAt: string,
  results: (number[] | null)[],
  now: string,
) {
  const failed = results.filter((result) => result === null).length;
  const realms = new Map<number, number>();
  for (const result of results)
    for (const item of result ?? []) realms.set(item, (realms.get(item) ?? 0) + 1);
  const status =
    results.length && failed * 2 <= results.length && realms.size ? 'complete' : 'failed';
  const record = db
    .prepare(`INSERT OR REPLACE INTO realm_sweeps
      (id, version, started_at, completed_at, status, realms, failed_realms, items)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, version, startedAt, now, status, results.length, failed, realms.size);
  if (status === 'failed') {
    await record.run();
    return { status, realms: results.length, failedRealms: failed, items: 0 };
  }
  const rows = [...realms];
  const statements = [db.prepare('DELETE FROM item_observations WHERE version = ?').bind(version)];
  // One JSON parameter per statement stays under D1's bound-parameter limit.
  for (let offset = 0; offset < rows.length; offset += 2000)
    statements.push(
      db
        .prepare(`INSERT INTO item_observations (version, item_id, realms)
        SELECT ?, json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?)`)
        .bind(version, JSON.stringify(rows.slice(offset, offset + 2000))),
    );
  statements.push(record);
  await db.batch(statements);
  return { status, realms: results.length, failedRealms: failed, items: realms.size };
}

// --- Synonyms ---

export type SynonymRecord = {
  id: number;
  kind: 'item' | 'word';
  term: string;
  /** Item ids for an item synonym, expansion words for a word synonym. */
  itemIds: number[];
  expansion: string;
  updatedAt: string;
};
export type SynonymInput = {
  id?: number;
  kind: 'item' | 'word';
  term: string;
  itemIds?: number[];
  expansion?: string;
};

export async function listSynonyms(db: Database): Promise<SynonymRecord[]> {
  const rows = await db
    .prepare(
      'SELECT id, kind, term, target, updated_at AS updatedAt FROM search_synonyms ORDER BY kind, term',
    )
    .all<{ id: number; kind: 'item' | 'word'; term: string; target: string; updatedAt: string }>();
  return rows.results.map(({ target, ...row }) => ({
    ...row,
    itemIds: row.kind === 'item' ? (JSON.parse(target) as number[]) : [],
    expansion: row.kind === 'word' ? target : '',
  }));
}

export function toSynonyms(records: SynonymRecord[]): Synonyms {
  return {
    items: records
      .filter((record) => record.kind === 'item')
      .map((record) => ({ term: record.term, itemIds: record.itemIds })),
    words: records
      .filter((record) => record.kind === 'word')
      .map((record) => ({ term: record.term, expansion: record.expansion })),
  };
}

/** Normalizes a Synonym edit and rejects terms search could never match. */
export function validateSynonym(input: SynonymInput) {
  if (input.kind !== 'item' && input.kind !== 'word') throw new Error('Unknown synonym kind');
  const term = words(input.term ?? '').join(' ');
  if (!term || term.length > 60) throw new Error('Enter a term of 1 to 60 letters or digits');
  if (input.kind === 'word') {
    if (term.includes(' ')) throw new Error('A word synonym replaces a single word');
    const expansion = words(input.expansion ?? '').join(' ');
    if (!expansion || expansion.split(' ').length > 6)
      throw new Error('Enter 1 to 6 words for the expansion');
    if (expansion === term) throw new Error('The expansion must differ from the term');
    return { kind: input.kind, term, target: expansion };
  }
  const itemIds = [...new Set(input.itemIds ?? [])];
  if (
    !itemIds.length ||
    itemIds.length > 20 ||
    !itemIds.every((id) => Number.isSafeInteger(id) && id > 0)
  )
    throw new Error('Enter 1 to 20 item ids');
  return { kind: input.kind, term, target: JSON.stringify(itemIds), itemIds };
}

export async function saveSynonym(
  db: Database,
  input: SynonymInput,
  now = new Date().toISOString(),
) {
  const synonym = validateSynonym(input);
  if (synonym.itemIds) {
    const placeholders = synonym.itemIds.map(() => '?').join(',');
    const found = await db
      .prepare(`SELECT id FROM item_metadata WHERE id IN (${placeholders})`)
      .bind(...synonym.itemIds)
      .all<{ id: number }>();
    const known = new Set(found.results.map((row) => row.id));
    const missing = synonym.itemIds.filter((id) => !known.has(id));
    if (missing.length) throw new Error(`Unknown item ids: ${missing.join(', ')}`);
  }
  const clash = await db
    .prepare('SELECT id FROM search_synonyms WHERE kind = ? AND term = ?')
    .bind(synonym.kind, synonym.term)
    .first<{ id: number }>();
  if (clash && clash.id !== input.id) throw new Error(`"${synonym.term}" already exists`);
  if (input.id) {
    const updated = await db
      .prepare(
        'UPDATE search_synonyms SET kind = ?, term = ?, target = ?, updated_at = ? WHERE id = ?',
      )
      .bind(synonym.kind, synonym.term, synonym.target, now, input.id)
      .run();
    if (!updated.meta.changes) throw new Error('Synonym not found');
  } else {
    await db
      .prepare('INSERT INTO search_synonyms (kind, term, target, updated_at) VALUES (?, ?, ?, ?)')
      .bind(synonym.kind, synonym.term, synonym.target, now)
      .run();
  }
}

export async function deleteSynonym(db: Database, id: number) {
  await db.prepare('DELETE FROM search_synonyms WHERE id = ?').bind(id).run();
}

// --- Sale rates ---

export type SaleRateUpload = {
  version: string;
  /** TSM region keys the rates came from, e.g. "Forever-EU". */
  sources: string[];
  /** When TSM produced the data. */
  downloadedAt: string;
  /** [item id, units sold per day]. */
  rates: [number, number][];
};

/**
 * Replaces a Game version's Sale rates with an upload from the operator's TSM region data,
 * unless the stored rates are at least as recent.
 */
export async function recordSaleRates(
  db: Database,
  upload: SaleRateUpload,
  now = new Date().toISOString(),
) {
  if (!isSearchableVersion(upload.version)) throw new Error(`Unknown version ${upload.version}`);
  if (
    !Array.isArray(upload.sources) ||
    !upload.sources.length ||
    !upload.sources.every(
      (source) => typeof source === 'string' && /^[A-Za-z0-9-]{1,40}$/.test(source),
    )
  )
    throw new Error('Invalid sale rate sources');
  const downloadedAt = new Date(upload.downloadedAt);
  if (!Number.isFinite(downloadedAt.getTime())) throw new Error('Invalid sale rate download time');
  if (
    !Array.isArray(upload.rates) ||
    !upload.rates.length ||
    upload.rates.length > 100_000 ||
    !upload.rates.every(
      (rate) =>
        Array.isArray(rate) &&
        Number.isSafeInteger(rate[0]) &&
        rate[0] > 0 &&
        Number.isFinite(rate[1]) &&
        rate[1] >= 0,
    )
  )
    throw new Error('Invalid sale rates');
  const stored = await db
    .prepare('SELECT downloaded_at AS downloadedAt FROM sale_rate_uploads WHERE version = ?')
    .bind(upload.version)
    .first<{ downloadedAt: string }>();
  if (stored && stored.downloadedAt >= downloadedAt.toISOString())
    return { version: upload.version, status: 'stale' as const, items: 0 };
  const statements = [
    db.prepare('DELETE FROM item_sale_rates WHERE version = ?').bind(upload.version),
  ];
  for (let offset = 0; offset < upload.rates.length; offset += 2000)
    statements.push(
      db
        .prepare(`INSERT OR REPLACE INTO item_sale_rates (version, item_id, sold_per_day)
        SELECT ?, json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?)`)
        .bind(upload.version, JSON.stringify(upload.rates.slice(offset, offset + 2000))),
    );
  statements.push(
    db
      .prepare(`INSERT OR REPLACE INTO sale_rate_uploads
        (version, sources, downloaded_at, uploaded_at, items) VALUES (?, ?, ?, ?, ?)`)
      .bind(
        upload.version,
        upload.sources.join(','),
        downloadedAt.toISOString(),
        now,
        upload.rates.length,
      ),
  );
  await db.batch(statements);
  return { version: upload.version, status: 'stored' as const, items: upload.rates.length };
}

/**
 * Popularity: the log-scaled Sale rate (ten times the sales is one step up, so stackables like
 * arrows do not drown everything else), with the realm count breaking ties. Versions without
 * Sale rates rank by realm count alone.
 */
export function popularityScore(realms: number, soldPerDay: number | undefined) {
  const sales = soldPerDay ? Math.round(Math.log10(1 + soldPerDay) * 100) : 0;
  return sales * 1000 + Math.min(realms, 999);
}

// --- Index build ---

type CatalogRow = {
  id: number;
  name: string;
  slug: string;
  quality: number;
  icon: string;
  type: string;
  firstSeenAt: string;
};

async function searchCandidates(db: Database) {
  const rows: CatalogRow[] = [];
  // Unknown binding (before the next catalog import) counts as unbound.
  for (let after = 0; ; ) {
    const page = await db
      .prepare(`SELECT id, name, slug, quality, icon, item_subclass AS type,
        first_seen_at AS firstSeenAt FROM item_metadata
        WHERE id > ? AND (binding IS NULL OR binding NOT IN ('ON_ACQUIRE', 'QUEST'))
        ORDER BY id LIMIT 5000`)
      .bind(after)
      .all<CatalogRow>();
    rows.push(...page.results);
    if (page.results.length < 5000) return rows;
    after = page.results.at(-1)!.id;
  }
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Rebuilds every Game version's index and points `search_indexes` at the new files. */
export async function rebuildSearchIndexes(env: SearchIndexEnv, now = new Date()) {
  const [candidates, records] = await Promise.all([
    searchCandidates(env.MARKET),
    listSynonyms(env.MARKET),
  ]);
  const synonyms = toSynonyms(records);
  const builtAt = now.toISOString();
  const graceStart = new Date(now.getTime() - SEARCH_GRACE_DAYS * DAY_MS).toISOString();
  const built: Record<string, { hash: string; items: number }> = {};
  for (const version of searchableVersions) {
    const swept = await env.MARKET.prepare(
      "SELECT id FROM realm_sweeps WHERE version = ? AND status = 'complete' LIMIT 1",
    )
      .bind(version)
      .first();
    const observations = await env.MARKET.prepare(
      'SELECT item_id AS id, realms FROM item_observations WHERE version = ?',
    )
      .bind(version)
      .all<{ id: number; realms: number }>();
    const realms = new Map(observations.results.map((row) => [row.id, row.realms]));
    const sales = await env.MARKET.prepare(
      'SELECT item_id AS id, sold_per_day AS soldPerDay FROM item_sale_rates WHERE version = ?',
    )
      .bind(version)
      .all<{ id: number; soldPerDay: number }>();
    const saleRates = new Map(sales.results.map((row) => [row.id, row.soldPerDay]));
    // Until a version's first successful sweep, every unbound catalog item is searchable.
    const items: SearchItem[] = candidates
      .filter((row) => !swept || realms.has(row.id) || row.firstSeenAt >= graceStart)
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        icon: /^[a-z0-9_]+$/.test(row.icon) ? row.icon : '',
        quality: row.quality,
        type: row.type || null,
        popularity: popularityScore(realms.get(row.id) ?? 0, saleRates.get(row.id)),
      }));
    const ids = new Set(items.map((item) => item.id));
    const file = encodeIndex(version, builtAt, items, {
      items: synonyms.items
        .map((synonym) => ({ ...synonym, itemIds: synonym.itemIds.filter((id) => ids.has(id)) }))
        .filter((synonym) => synonym.itemIds.length),
      words: synonyms.words,
    });
    const body = JSON.stringify(file);
    // The build time is excluded so unchanged contents keep their URL and browser cache.
    const hash = (await sha256(JSON.stringify({ ...file, builtAt: '' }))).slice(0, 16);
    await env.SEARCH_INDEXES.put(searchIndexKey(version, hash), body, {
      httpMetadata: { contentType: 'application/json', cacheControl: SEARCH_INDEX_CACHE_CONTROL },
    });
    await env.MARKET.prepare(`INSERT INTO search_indexes (version, hash, items, built_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(version) DO UPDATE SET hash = excluded.hash, items = excluded.items,
        built_at = excluded.built_at`)
      .bind(version, hash, items.length, builtAt)
      .run();
    const stored = await env.SEARCH_INDEXES.list({ prefix: `search-index/${version}/` });
    const stale = stored.objects
      .filter(
        (object) =>
          object.key !== searchIndexKey(version, hash) &&
          object.uploaded.getTime() < now.getTime() - SUPERSEDED_INDEX_MS,
      )
      .map((object) => object.key);
    if (stale.length) await env.SEARCH_INDEXES.delete(stale);
    built[version] = { hash, items: items.length };
  }
  return built;
}

/** The current index hash per Game version, for pages to embed. */
export async function searchManifest(db: Database) {
  const rows = await db
    .prepare('SELECT version, hash FROM search_indexes')
    .all<{ version: string; hash: string }>();
  return Object.fromEntries(rows.results.map((row) => [row.version, row.hash])) as Partial<
    Record<SearchableVersion, string>
  >;
}
