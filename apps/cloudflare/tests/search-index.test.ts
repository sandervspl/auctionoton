import { createSearchEngine, decodeIndex, type SearchIndexFile } from '@auctionoton/search';
import { createScheduledController, introspectWorkflow } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { beforeEach, expect, it } from 'vitest';
import worker from '../src/index';
import { compactItemIcon, itemIconUrl } from '../src/item-icons';
import {
  SWEEP_CRON,
  observeRealm,
  rebuildSearchIndexes,
  recordSweep,
  saveSynonym,
  searchIndexKey,
  searchManifest,
  sweepRealms,
  validateSynonym,
  popularityScore,
  recordSaleRates,
  listSynonyms,
  deleteSynonym,
} from '../src/search-index';

const now = new Date('2026-11-27T12:00:00.000Z');
const old = '2026-01-01T00:00:00.000Z';

beforeEach(async () => {
  await env.MARKET.batch([
    env.MARKET.prepare('DELETE FROM item_metadata'),
    env.MARKET.prepare('DELETE FROM item_observations'),
    env.MARKET.prepare('DELETE FROM realm_sweeps'),
    env.MARKET.prepare('DELETE FROM search_synonyms'),
    env.MARKET.prepare('DELETE FROM search_indexes'),
    env.MARKET.prepare('DELETE FROM item_sale_rates'),
    env.MARKET.prepare('DELETE FROM sale_rate_uploads'),
    env.MARKET.prepare(`INSERT INTO item_metadata
      (id, name, slug, quality, icon, binding, item_subclass, first_seen_at, catalogs) VALUES
      (13468, 'Black Lotus', 'black-lotus', 2, 'inv_misc_herb_blacklotus', NULL, 'Herb', '${old}', 'classic1x,classicann,forever'),
      (12360, 'Arcanite Bar', 'arcanite-bar', 2, 'inv_misc_stonetablet_05', NULL, 'Metal & Stone', '${old}', 'classic1x,classicann,forever'),
      (19019, 'Thunderfury, Blessed Blade of the Windseeker', 'thunderfury', 5, '', 'ON_ACQUIRE', 'Sword', '${old}', 'classic1x,classicann,forever'),
      (5805, 'Heart of Zeal', 'heart-of-zeal', 1, '', 'QUEST', 'Quest', '${old}', 'classic1x,classicann,forever'),
      (90001, 'Brand New Bar', 'brand-new-bar', 1, 'https://example.com/legacy.jpg', NULL, '', '2026-11-20T00:00:00.000Z', 'classic1x,classicann,forever'),
      (90002, 'Never Listed', 'never-listed', 1, '', NULL, '', '${old}', 'classic1x,classicann,forever'),
      (252486, 'Ironfeather Leggings', 'ironfeather-leggings', 4, 'forever:134651', 'ON_EQUIP', 'Leather', '${old}', 'forever'),
      (20816, 'Delicate Copper Wire', 'delicate-copper-wire', 1, 'classicann:inv_misc_wire_01', NULL, 'Parts', '${old}', 'classicann')`),
  ]);
});

async function loadIndex(version: string) {
  const hash = (await searchManifest(env.MARKET))[version as 'era'];
  expect(hash).toBeTruthy();
  const object = await env.SEARCH_INDEXES.get(searchIndexKey(version, hash!));
  expect(object?.httpMetadata?.cacheControl).toContain('immutable');
  return decodeIndex((await object!.json()) as SearchIndexFile);
}

it('lists one sweep target per catalog realm with a price list per faction', () => {
  const realms = sweepRealms('forever');
  expect(realms.length).toBeGreaterThan(0);
  expect(realms[0]!.urls).toEqual([
    expect.stringMatching(
      /^https:\/\/public-data\.tradeskillmaster\.com\/forever\/(eu|us)\/realm\/.+-alliance\/items\.csv$/,
    ),
    expect.stringMatching(/-horde\/items\.csv$/),
  ]);
  expect(sweepRealms('era').every((realm) => realm.version === 'era')).toBe(true);
});

it('reads item ids from public price lists and tolerates a missing faction', async () => {
  const csv =
    'itemId,name,marketValue\n13468,Black Lotus,1\n"12360","Arcanite, Bar",2\nbad,x,1\n13468,dup,1\n';
  const fetcher = (async (url: string) =>
    url.includes('horde')
      ? new Response('gone', { status: 404 })
      : new Response(csv)) as typeof fetch;
  const realm = {
    version: 'era' as const,
    region: 'eu' as const,
    slug: 'x',
    urls: ['a-alliance', 'b-horde'],
  };
  expect(await observeRealm(realm, fetcher)).toEqual([12360, 13468]);
  const missing = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
  expect(await observeRealm(realm, missing)).toBeNull();
  const failing = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
  await expect(observeRealm(realm, failing)).rejects.toThrow('503');
});

it('keeps the previous observations when most realms fail', async () => {
  await recordSweep(
    env.MARKET,
    'era',
    's1',
    old,
    [[13468], [13468, 12360], null],
    now.toISOString(),
  );
  const rows = await env.MARKET.prepare(
    "SELECT item_id, realms FROM item_observations WHERE version = 'era' ORDER BY item_id",
  ).all();
  expect(rows.results).toEqual([
    { item_id: 12360, realms: 1 },
    { item_id: 13468, realms: 2 },
  ]);
  const failed = await recordSweep(
    env.MARKET,
    'era',
    's2',
    old,
    [[1], null, null],
    now.toISOString(),
  );
  expect(failed.status).toBe('failed');
  const after = await env.MARKET.prepare(
    "SELECT COUNT(*) AS n FROM item_observations WHERE version = 'era'",
  ).first<{ n: number }>();
  expect(after?.n).toBe(2);
});

it('builds per Game version indexes of Searchable items with Popularity', async () => {
  // Era has been swept; Forever has not, so every unbound item is searchable there.
  await recordSweep(env.MARKET, 'era', 's1', old, [[13468], [13468, 12360]], now.toISOString());
  await saveSynonym(env.MARKET, { kind: 'item', term: 'BL', itemIds: [13468, 19019] });
  await saveSynonym(env.MARKET, { kind: 'word', term: 'bar', expansion: 'Ingot' });
  const built = await rebuildSearchIndexes(env, now);
  expect(Object.keys(built).sort()).toEqual([
    'anniversary',
    'era',
    'forever',
    'hardcore',
    'seasonal',
  ]);

  const era = await loadIndex('era');
  expect(era.items.map((item) => [item.id, item.popularity])).toEqual([
    [12360, 1],
    [13468, 2],
    [90001, 0], // within the grace window
  ]);
  expect(era.items[1]).toMatchObject({
    slug: 'black-lotus',
    icon: 'inv_misc_herb_blacklotus',
    type: 'Herb',
  });
  expect(era.items[2]?.icon).toBe('');
  // Thunderfury binds on pickup, so the synonym keeps only the Searchable item.
  expect(era.synonyms.items).toEqual([{ term: 'bl', itemIds: [13468] }]);
  expect(era.synonyms.words).toEqual([{ term: 'bar', expansion: 'ingot' }]);
  expect(createSearchEngine(era.items, era.synonyms).search('bl')[0]?.name).toBe('Black Lotus');

  const forever = await loadIndex('forever');
  // Forever holds its own catalog's items, never Anniversary's.
  expect(forever.items.map((item) => item.id)).toEqual([12360, 13468, 90001, 90002, 252486]);
  expect(forever.items.at(-1)?.icon).toBe('forever:134651');
  expect(era.items.map((item) => item.id)).not.toContain(252486);
  const anniversary = await loadIndex('anniversary');
  expect(anniversary.items.map((item) => item.id)).toContain(20816);
  expect(anniversary.items.map((item) => item.id)).not.toContain(252486);
});

it('expands compact icons from every item catalog', () => {
  expect(itemIconUrl('inv_misc_herb_blacklotus')).toBe(
    'https://render.worldofwarcraft.com/classic1x-eu/icons/56/inv_misc_herb_blacklotus.jpg',
  );
  expect(itemIconUrl('forever:134651')).toBe(
    'https://render.worldofwarcraft.com/forever-eu/icons/56/134651.jpg',
  );
  expect(
    compactItemIcon('https://render.worldofwarcraft.com/classicann-eu/icons/56/inv_boots_09.jpg'),
  ).toBe('classicann:inv_boots_09');
  expect(
    compactItemIcon(
      'https://render.worldofwarcraft.com/classicann-eu/icons/56/inv-mount_raven_54.jpg',
    ),
  ).toBe('classicann:inv-mount_raven_54');
  expect(itemIconUrl('classicann:inv-mount_raven_54')).toBe(
    'https://render.worldofwarcraft.com/classicann-eu/icons/56/inv-mount_raven_54.jpg',
  );
  expect(() =>
    compactItemIcon('https://render.worldofwarcraft.com/retail-eu/icons/56/x.jpg'),
  ).toThrow();
});

it('keeps an unchanged index at the same URL and removes superseded files after a day', async () => {
  const first = await rebuildSearchIndexes(env, now);
  const again = await rebuildSearchIndexes(env, new Date(now.getTime() + 60_000));
  expect(again.era?.hash).toBe(first.era?.hash);
  await saveSynonym(env.MARKET, { kind: 'word', term: 'bl', expansion: 'black lotus' });
  const changed = await rebuildSearchIndexes(env, new Date(now.getTime() + 2 * 86_400_000));
  expect(changed.era?.hash).not.toBe(first.era?.hash);
  const files = await env.SEARCH_INDEXES.list({ prefix: 'search-index/era/' });
  expect(files.objects.map((object) => object.key)).toEqual([
    searchIndexKey('era', changed.era!.hash),
  ]);
});

it('validates Synonyms before saving them', async () => {
  expect(validateSynonym({ kind: 'word', term: " Pot's ", expansion: 'Potion' })).toMatchObject({
    term: 'pots',
    target: 'potion',
  });
  expect(() => validateSynonym({ kind: 'word', term: 'two words', expansion: 'x' })).toThrow(
    'single word',
  );
  expect(() => validateSynonym({ kind: 'item', term: '!!', itemIds: [1] })).toThrow('term');
  expect(() => validateSynonym({ kind: 'item', term: 'x', itemIds: [] })).toThrow('item ids');
  await expect(
    saveSynonym(env.MARKET, { kind: 'item', term: 'x', itemIds: [404] }),
  ).rejects.toThrow('Unknown item ids: 404');
  await saveSynonym(env.MARKET, { kind: 'item', term: 'lotus', itemIds: [13468] });
  await expect(
    saveSynonym(env.MARKET, { kind: 'item', term: 'Lotus', itemIds: [12360] }),
  ).rejects.toThrow('already exists');
  const [saved] = await listSynonyms(env.MARKET);
  await saveSynonym(env.MARKET, { id: saved!.id, kind: 'item', term: 'lotus', itemIds: [12360] });
  expect((await listSynonyms(env.MARKET))[0]?.itemIds).toEqual([12360]);
  await deleteSynonym(env.MARKET, saved!.id);
  expect(await listSynonyms(env.MARKET)).toEqual([]);
});

it('starts the weekly sweep from its cron and on demand', async () => {
  await using workflows = await introspectWorkflow(env.REALM_SWEEP);
  // Only the start matters here; never fetch real price lists from a test.
  await workflows.modifyAll(async (modifier) => {
    await modifier.disableRetryDelays();
    await modifier.mockStepError({ name: 'start' }, new Error('test sweep stopped'));
  });
  await worker.scheduled(
    createScheduledController({ scheduledTime: now.getTime(), cron: SWEEP_CRON }),
    env,
  );
  const response = await worker.fetch(
    new Request('https://api.example.com/admin/sweep', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.ADMIN_TOKEN}` },
    }),
    env,
    {} as ExecutionContext,
  );
  expect(response.status).toBe(202);
  expect(await workflows.get()).toHaveLength(2);
  expect((await env.REALM_SWEEP.get('sweep-2026-11-27')).id).toBe('sweep-2026-11-27');
});

it('ranks by log-scaled Sale rate with the realm count breaking ties', () => {
  expect(popularityScore(8, 15_000)).toBeGreaterThan(popularityScore(8, 270));
  expect(popularityScore(8, 270)).toBeGreaterThan(popularityScore(8, 4.5));
  expect(popularityScore(8, 4.5)).toBeGreaterThan(popularityScore(80, undefined));
  expect(popularityScore(9, 270)).toBeGreaterThan(popularityScore(8, 270));
  expect(popularityScore(5, undefined)).toBe(5);
});

it('stores the newest Sale rates and ranks the index by them', async () => {
  await recordSweep(env.MARKET, 'forever', 'f1', old, [[13468, 12360]], now.toISOString());
  const upload = {
    version: 'forever',
    sources: ['Forever-EU'],
    downloadedAt: '2026-11-27T00:00:00.000Z',
    rates: [
      [13468, 2.5],
      [12360, 140],
    ] as [number, number][],
  };
  expect(await recordSaleRates(env.MARKET, upload)).toMatchObject({ status: 'stored', items: 2 });
  expect(
    await recordSaleRates(env.MARKET, { ...upload, downloadedAt: '2026-11-26T00:00:00.000Z' }),
  ).toMatchObject({ status: 'stale' });
  await rebuildSearchIndexes(env, now);
  const forever = await loadIndex('forever');
  const score = (id: number) => forever.items.find((item) => item.id === id)?.popularity ?? -1;
  expect(score(12360)).toBeGreaterThan(score(13468));
  expect(score(13468)).toBeGreaterThan(score(90001));
  await expect(recordSaleRates(env.MARKET, { ...upload, version: 'classic' })).rejects.toThrow(
    'Unknown version',
  );
  await expect(
    recordSaleRates(env.MARKET, { ...upload, rates: [[0, 1]] as [number, number][] }),
  ).rejects.toThrow('Invalid sale rates');
});

it('accepts Sale rate uploads only from the operator', async () => {
  const send = (headers: Record<string, string>, body: unknown) =>
    worker.fetch(
      new Request('https://api.example.com/admin/search/sale-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
      env,
      {} as ExecutionContext,
    );
  const uploads = [
    {
      version: 'era',
      sources: ['Classic-EU'],
      downloadedAt: now.toISOString(),
      rates: [[13468, 1]],
    },
  ];
  expect((await send({}, { uploads })).status).toBe(401);
  const auth = { Authorization: `Bearer ${env.ADMIN_TOKEN}` };
  expect((await send(auth, { uploads: [] })).status).toBe(400);
  const stored = await send(auth, { uploads });
  expect(stored.status).toBe(200);
  const body = await stored.json<{ results: { status: string }[]; indexes?: object }>();
  expect(body.results[0]?.status).toBe('stored');
  expect(body.indexes).toBeDefined();
});

it('keeps Observed items whichever catalog lists them', async () => {
  // Forever's auction houses list 20816, which only the Anniversary catalog contains.
  await recordSweep(env.MARKET, 'forever', 'f1', old, [[13468, 20816]], now.toISOString());
  await rebuildSearchIndexes(env, now);
  const forever = (await loadIndex('forever')).items.map((item) => item.id);
  // 90001 is a new item within the grace window that every catalog lists.
  expect(forever).toEqual([13468, 20816, 90001]);
  // Unobserved Anniversary items stay out of Forever even before Anniversary is swept.
  const anniversary = (await loadIndex('anniversary')).items.map((item) => item.id);
  expect(anniversary).toContain(20816);
  expect(anniversary).not.toContain(252486);
});
