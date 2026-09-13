import { JSONParser } from '@streamparser/json';
import { houseKey, snapshotId, validatePrice } from './contracts';
import type { Archive, AuctionJob, Manifest, Price } from './contracts';
import type { Env } from './env';
import { providerFetch } from './provider';

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
  const rawKey = `raw/${snapshotId(job)}.json`;
  const existing = await env.SNAPSHOTS.head(rawKey);
  if (existing?.customMetadata?.fetchedAt) {
    return {
      rawKey,
      fetchedAt: existing.customMetadata.fetchedAt,
      providerModifiedAt: existing.customMetadata.providerModifiedAt || null,
      bytes: existing.size,
    };
  }
  const response = await providerFetch(
    env,
    job.version,
    `https://pricing-api.tradeskillmaster.com/ah/${job.auctionHouseId}`,
  );
  if (!response.body) throw new Error('Empty TSM response body');
  if (Number(response.headers.get('content-length')) > MAX_RAW_BYTES) {
    await response.body.cancel();
    throw new Error('TSM snapshot exceeds the 64 MiB trial limit');
  }
  const fetchedAt = new Date().toISOString();
  const modified = Date.parse(response.headers.get('last-modified') ?? '');
  const providerModifiedAt = Number.isFinite(modified) ? new Date(modified).toISOString() : null;
  const bytes = await archiveStream(env.SNAPSHOTS, rawKey, response.body, {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: {
      fetchedAt,
      providerModifiedAt: providerModifiedAt ?? '',
      contentEncoding: response.headers.get('content-encoding') ?? '',
      contentLength: response.headers.get('content-length') ?? '',
    },
  });
  return { rawKey, fetchedAt, providerModifiedAt, bytes };
}

export async function normalizeArchive(
  env: Env,
  job: AuctionJob,
  archive: Archive,
): Promise<Manifest> {
  const raw = await env.SNAPSHOTS.get(archive.rawKey);
  if (!raw || raw.size > MAX_RAW_BYTES) throw new Error('Missing or oversized R2 archive');
  const parser = new JSONParser({ paths: ['$.*'], keepStack: false });
  let pending: Price[] = [];
  let rows = 0;
  let chunks = 0;
  let firstByte = false;
  let complete = false;
  let consumed = 0;
  let lastRowEnd = 0;
  let tokenOffset = 0;
  parser.onToken = ({ offset }) => {
    tokenOffset = offset;
  };
  parser.onValue = ({ value, parent }) => {
    if (!Array.isArray(parent)) throw new Error('TSM payload must be an array');
    pending.push(validatePrice(value, job.auctionHouseId));
    lastRowEnd = tokenOffset + 1;
  };
  parser.onEnd = () => {
    complete = true;
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
      const slice = bytes.subarray(offset, offset + 16_384);
      if (!firstByte) {
        for (const byte of slice) {
          if ([9, 10, 13, 32].includes(byte)) continue;
          if (byte !== 91) throw new Error('TSM payload must be an array');
          firstByte = true;
          break;
        }
      }
      parser.write(slice);
      consumed += slice.length;
      if (consumed - lastRowEnd > 64 * 1024) throw new Error('Oversized auction row');
      while (pending.length >= CHUNK_ROWS) await flush(CHUNK_ROWS);
    }
  }
  if (!parser.isEnded) parser.end();
  if (!firstByte || !complete) throw new Error('Incomplete TSM JSON');
  if (pending.length) await flush(pending.length);
  pending = [];
  const manifest = { ...archive, chunks, rows };
  await env.SNAPSHOTS.put(`normalized/${snapshotId(job)}/manifest.json`, JSON.stringify(manifest));
  return manifest;
}

export async function beginSnapshot(db: D1Database, job: AuctionJob) {
  const id = snapshotId(job);
  const existing = await db
    .prepare('SELECT status FROM snapshots WHERE id = ?')
    .bind(id)
    .first<{ status: string }>();
  if (existing?.status === 'complete') return false;
  await db
    .prepare(`INSERT INTO snapshots(id, house_key, region, version, auction_house_id, day, status)
    VALUES (?, ?, ?, ?, ?, ?, 'writing')
    ON CONFLICT(id) DO UPDATE SET status = 'writing', error = NULL WHERE status != 'complete'`)
    .bind(id, houseKey(job), job.region, job.version, job.auctionHouseId, job.day)
    .run();
  return true;
}

export async function writeChunk(env: Env, job: AuctionJob, index: number) {
  const object = await env.SNAPSHOTS.get(chunkKey(snapshotId(job), index));
  if (!object || object.size > 512 * 1024) throw new Error('Missing or oversized normalized chunk');
  const values = await object.json<unknown[]>();
  if (!Array.isArray(values) || values.length > CHUNK_ROWS)
    throw new Error('Invalid normalized chunk');
  const rows = values.map((value) => validatePrice(value, job.auctionHouseId));
  const statements: D1PreparedStatement[] = [];
  // Eight columns x twelve rows = 96, within D1's 100 bound-parameter limit.
  for (let offset = 0; offset < rows.length; offset += 12) {
    const batch = rows.slice(offset, offset + 12);
    statements.push(
      env.MARKET.prepare(`INSERT INTO prices
      (snapshot_id, item_id, pet_species_id, min_buyout, quantity, market_value, historical, num_auctions)
      VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',')}
      ON CONFLICT(snapshot_id, item_id, pet_species_id) DO NOTHING`).bind(
        ...batch.flatMap((row) => [
          snapshotId(job),
          row.itemId,
          row.petSpeciesId ?? 0,
          row.minBuyout,
          row.quantity,
          row.marketValue,
          row.historical,
          row.numAuctions,
        ]),
      ),
    );
  }
  if (statements.length) await env.MARKET.batch(statements);
  return { rows: rows.length };
}

export async function publishSnapshot(db: D1Database, job: AuctionJob, manifest: Manifest) {
  const id = snapshotId(job);
  const count = await db
    .prepare('SELECT COUNT(*) AS count FROM prices WHERE snapshot_id = ?')
    .bind(id)
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
        id,
      ),
    db
      .prepare(`INSERT INTO published_houses(house_key, snapshot_id, day) VALUES (?, ?, ?)
      ON CONFLICT(house_key) DO UPDATE SET snapshot_id = excluded.snapshot_id, day = excluded.day
      WHERE published_houses.day < excluded.day`)
      .bind(houseKey(job), id, job.day),
  ]);
  return { id, rows: manifest.rows, bytes: manifest.bytes, fetchedAt: manifest.fetchedAt };
}
