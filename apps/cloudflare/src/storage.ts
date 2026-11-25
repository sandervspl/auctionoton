import { houseKey, snapshotId, validatePrice } from './contracts';
import type { Archive, AuctionJob, Manifest, Price } from './contracts';
import { CsvParser } from './csv';
import type { Env } from './env';
import { auctionHouseCsvUrl } from './realms';
import { oldestPriceDay } from './retention';

export const CHUNK_ROWS = 500;
export const MAX_RAW_BYTES = 64 * 1024 * 1024;
export const chunkKey = (id: string, index: number) => `normalized/${id}/${index}.json`;

export async function archiveStream(
  bucket: R2Bucket,
  key: string,
  body: ReadableStream<Uint8Array>,
  options: R2MultipartOptions,
): Promise<number> {
  // gzip and chunked HTTP bodies have no known length for R2.put(). Each multipart
  // part is a bounded byte array, independent of upstream transfer encoding.
  const upload = await bucket.createMultipartUpload(key, options);
  const reader = body.getReader();
  const buffer = new Uint8Array(5 * 1024 * 1024);
  const parts: R2UploadedPart[] = [];
  let filled = 0;
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RAW_BYTES) throw new Error('TSM snapshot exceeds the 64 MiB trial limit');
      for (let offset = 0; offset < value.length; ) {
        const length = Math.min(buffer.length - filled, value.length - offset);
        buffer.set(value.subarray(offset, offset + length), filled);
        offset += length;
        filled += length;
        if (filled === buffer.length) {
          parts.push(await upload.uploadPart(parts.length + 1, buffer));
          filled = 0;
        }
      }
    }
    if (total === 0) throw new Error('Empty TSM response body');
    if (filled) parts.push(await upload.uploadPart(parts.length + 1, buffer.subarray(0, filled)));
    await upload.complete(parts);
    return total;
  } catch (error) {
    try {
      await upload.abort();
    } catch {
      console.warn('R2 multipart abort failed; lifecycle cleanup will retry');
    }
    throw error;
  } finally {
    await reader.cancel();
  }
}

export async function archiveHouse(env: Env, job: AuctionJob): Promise<Archive> {
  const rawKey = `raw/${snapshotId(job)}.csv`;
  const existing = await env.SNAPSHOTS.head(rawKey);
  if (existing?.customMetadata?.fetchedAt) {
    return {
      rawKey,
      fetchedAt: existing.customMetadata.fetchedAt,
      providerModifiedAt: existing.customMetadata.providerModifiedAt || null,
      bytes: existing.size,
    };
  }
  const url = auctionHouseCsvUrl(job);
  if (!url) throw new Error(`Auction house ${houseKey(job)} is absent from the realm catalog`);
  const response = await fetch(url, {
    headers: { Accept: 'text/csv' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`TSM public data HTTP ${response.status}`);
  }
  if (!response.body) throw new Error('Empty TSM response body');
  if (Number(response.headers.get('content-length')) > MAX_RAW_BYTES) {
    await response.body.cancel();
    throw new Error('TSM snapshot exceeds the 64 MiB trial limit');
  }
  const fetchedAt = new Date().toISOString();
  const modified = Date.parse(response.headers.get('last-modified') ?? '');
  const providerModifiedAt = Number.isFinite(modified)
    ? new Date(modified).toISOString()
    : (job.providerModifiedAt ?? null);
  const bytes = await archiveStream(env.SNAPSHOTS, rawKey, response.body, {
    httpMetadata: { contentType: 'text/csv' },
    customMetadata: {
      fetchedAt,
      providerModifiedAt: providerModifiedAt ?? '',
      contentEncoding: response.headers.get('content-encoding') ?? '',
      contentLength: response.headers.get('content-length') ?? '',
    },
  });
  return { rawKey, fetchedAt, providerModifiedAt, bytes };
}

const requiredColumns = ['itemId', 'marketValue', 'minBuyout', 'historical'] as const;

function csvInteger(value: string | undefined, column: string) {
  if (value === undefined || !/^\d+$/.test(value))
    throw new Error(`Invalid CSV integer: ${column}`);
  return Number(value);
}

export async function normalizeArchive(
  env: Env,
  job: AuctionJob,
  archive: Archive,
): Promise<Manifest> {
  const raw = await env.SNAPSHOTS.get(archive.rawKey);
  if (!raw || raw.size > MAX_RAW_BYTES) throw new Error('Missing or oversized R2 archive');
  const parser = new CsvParser();
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });
  let columns: Record<(typeof requiredColumns)[number], number> | undefined;
  let pending: Price[] = [];
  const seen = new Set<number>();
  let rows = 0;
  let chunks = 0;
  const accept = (record: string[]) => {
    if (!columns) {
      const header = record.map((name) => name.trim());
      const indexes = requiredColumns.map((name) => header.indexOf(name));
      if (indexes.some((index) => index < 0)) throw new Error('Unexpected TSM CSV header');
      columns = Object.fromEntries(requiredColumns.map((name, i) => [name, indexes[i]])) as never;
      return;
    }
    if (record.length === 1 && record[0] === '') return;
    const price = validatePrice(
      {
        auctionHouseId: job.auctionHouseId,
        itemId: csvInteger(record[columns.itemId], 'itemId'),
        minBuyout: csvInteger(record[columns.minBuyout], 'minBuyout'),
        marketValue: csvInteger(record[columns.marketValue], 'marketValue'),
        historical: csvInteger(record[columns.historical], 'historical'),
      },
      job.auctionHouseId,
    );
    // A repeated item would make the stored row count disagree with the manifest.
    if (seen.has(price.itemId)) throw new Error(`Duplicate item ${price.itemId}`);
    seen.add(price.itemId);
    pending.push(price);
  };
  const flush = async (count: number) => {
    const items = pending.splice(0, count);
    rows += items.length;
    await env.SNAPSHOTS.put(chunkKey(snapshotId(job), chunks++), JSON.stringify(items), {
      httpMetadata: { contentType: 'application/json' },
    });
  };
  for await (const bytes of raw.body) {
    // Feed bounded slices even if the source delivers a single large buffer.
    for (let offset = 0; offset < bytes.length; offset += 16_384) {
      const text = decoder.decode(bytes.subarray(offset, offset + 16_384), { stream: true });
      for (const record of parser.write(text)) accept(record);
      while (pending.length >= CHUNK_ROWS) await flush(CHUNK_ROWS);
    }
  }
  for (const record of parser.write(decoder.decode())) accept(record);
  for (const record of parser.end()) accept(record);
  if (!columns) throw new Error('Incomplete TSM CSV');
  while (pending.length) await flush(Math.min(CHUNK_ROWS, pending.length));
  pending = [];
  const manifest = { ...archive, chunks, rows };
  await env.SNAPSHOTS.put(`normalized/${snapshotId(job)}/manifest.json`, JSON.stringify(manifest));
  return manifest;
}

export async function beginSnapshot(db: D1Database, job: AuctionJob) {
  const id = snapshotId(job);
  const existing = await db
    .prepare('SELECT status FROM snapshots WHERE snapshot_key = ?')
    .bind(id)
    .first<{ status: string }>();
  if (existing?.status === 'complete') return false;
  // Collected daily keys must never be reused while an R2 cleanup may retry.
  if (!existing && job.day < oldestPriceDay(new Date().toISOString()))
    throw new Error('New snapshots must be within the 30-day retention window');
  await db
    .prepare(`INSERT INTO snapshots(snapshot_key, house_key, region, version, auction_house_id, day, status)
    VALUES (?, ?, ?, ?, ?, ?, 'writing')
    ON CONFLICT(snapshot_key) DO UPDATE SET status = 'writing', error = NULL WHERE status != 'complete'`)
    .bind(id, houseKey(job), job.region, job.version, job.auctionHouseId, job.day)
    .run();
  return true;
}

export async function snapshotStorageId(db: D1Database, job: AuctionJob): Promise<number> {
  const row = await db
    .prepare('SELECT id FROM snapshots WHERE snapshot_key = ?')
    .bind(snapshotId(job))
    .first<{ id: number }>();
  if (!row) throw new Error('Snapshot has not been started');
  return row.id;
}

export async function writeChunk(env: Env, job: AuctionJob, index: number) {
  const storageId = await snapshotStorageId(env.MARKET, job);
  const object = await env.SNAPSHOTS.get(chunkKey(snapshotId(job), index));
  if (!object || object.size > 512 * 1024) throw new Error('Missing or oversized normalized chunk');
  const values = await object.json<unknown[]>();
  if (!Array.isArray(values) || values.length > CHUNK_ROWS)
    throw new Error('Invalid normalized chunk');
  const rows = values.map((value) => validatePrice(value, job.auctionHouseId));
  const statements: D1PreparedStatement[] = [];
  // Five columns x nineteen rows = 95, within D1's 100 bound-parameter limit.
  for (let offset = 0; offset < rows.length; offset += 19) {
    const batch = rows.slice(offset, offset + 19);
    statements.push(
      env.MARKET.prepare(`INSERT INTO prices
      (snapshot_id, item_id, min_buyout, market_value, historical)
      VALUES ${batch.map(() => '(?, ?, ?, ?, ?)').join(',')}
      ON CONFLICT(snapshot_id, item_id) DO NOTHING`).bind(
        ...batch.flatMap((row) => [
          storageId,
          row.itemId,
          row.minBuyout,
          row.marketValue,
          row.historical,
        ]),
      ),
    );
  }
  if (statements.length) await env.MARKET.batch(statements);
  return { rows: rows.length };
}

export async function publishSnapshot(db: D1Database, job: AuctionJob, manifest: Manifest) {
  const id = snapshotId(job);
  const storageId = await snapshotStorageId(db, job);
  const count = await db
    .prepare('SELECT COUNT(*) AS count FROM prices WHERE snapshot_id = ?')
    .bind(storageId)
    .first<{ count: number }>();
  if (count?.count !== manifest.rows)
    throw new Error('Snapshot row count mismatch; publication refused');
  // The complete marker and pointer become visible in one transaction.
  await db.batch([
    db
      .prepare(`UPDATE snapshots SET status = 'complete', fetched_at = ?, provider_modified_at = ?,
      raw_key = ?, expected_rows = ?, raw_bytes = ?, completed_at = ?, error = NULL WHERE id = ?`)
      .bind(
        manifest.fetchedAt,
        manifest.providerModifiedAt,
        manifest.rawKey,
        manifest.rows,
        manifest.bytes,
        new Date().toISOString(),
        storageId,
      ),
    db
      .prepare(`INSERT INTO published_houses(house_key, snapshot_id, day) VALUES (?, ?, ?)
      ON CONFLICT(house_key) DO UPDATE SET snapshot_id = excluded.snapshot_id, day = excluded.day
      WHERE published_houses.day < excluded.day`)
      .bind(houseKey(job), storageId, job.day),
  ]);
  return { id, rows: manifest.rows, bytes: manifest.bytes, fetchedAt: manifest.fetchedAt };
}
