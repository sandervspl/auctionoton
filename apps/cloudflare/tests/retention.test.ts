import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import { cleanImportArtifactsBatch, prunePriceBatch } from '../src/retention';
import { beginSnapshot } from '../src/storage';

const now = '2026-09-14T04:30:00.000Z';
// Hot history covers 2026-08-31 onwards at `now`.
async function seed(
  key: string,
  day: string,
  status: string,
  published: boolean,
  { count = 1, archived = true } = {},
) {
  const rawKey = `raw/${key}.csv.gz`;
  const id = await env.MARKET.prepare(`INSERT INTO snapshots
    (snapshot_key,house_key,region,version,auction_house_id,day,status,fetched_at,completed_at,raw_key,archived_at)
    VALUES (?,?,'eu','seasonal',509,?,?,?,?,?,?) RETURNING id`)
    .bind(
      key,
      key,
      day,
      status,
      `${day}T04:00:00.000Z`,
      `${day}T04:01:00.000Z`,
      rawKey,
      archived && status === 'complete' ? `${day}T04:02:00.000Z` : null,
    )
    .first<number>('id');
  for (let offset = 0; offset < count; offset += 19) {
    const size = Math.min(19, count - offset);
    await env.MARKET.prepare(
      `INSERT INTO prices VALUES ${Array.from({ length: size }, () => '(?,?,100,100,100)').join(',')}`,
    )
      .bind(...Array.from({ length: size }, (_, i) => [id, offset + i + 1]).flat())
      .run();
  }
  if (published)
    await env.MARKET.prepare('INSERT INTO published_houses VALUES (?,?,?)')
      .bind(key, id, day)
      .run();
  await env.SNAPSHOTS.put(rawKey, '[]');
  await env.SNAPSHOTS.put(`normalized/${key}/0.json`, '[]');
  await env.SNAPSHOTS.put(`normalized/${key}/manifest.json`, '{}');
  return id;
}
const priceCount = (id: number | null) =>
  env.MARKET.prepare('SELECT COUNT(*) AS n FROM prices WHERE snapshot_id=?').bind(id).first('n');

it('prunes archived prices older than hot history while preserving stale published, recent, unarchived and unfinished snapshots', async () => {
  const expired = await seed('expired', '2026-08-30', 'complete', false, { count: 1001 });
  const unarchived = await seed('unarchived', '2026-08-01', 'complete', false, {
    archived: false,
  });
  const stale = await seed('stale', '2026-07-01', 'complete', true);
  const writing = await seed('writing', '2026-07-01', 'writing', false);
  const failed = await seed('failed', '2026-07-01', 'failed', false);
  const boundary = await seed('boundary', '2026-08-31', 'complete', false);
  const recent = await seed('recent', '2026-09-13', 'complete', false);
  const result = await prunePriceBatch(env.MARKET, now);
  expect(result).toEqual({ rows: 1001, snapshots: 1, done: true });
  expect(await priceCount(expired)).toBe(0);
  for (const id of [unarchived, stale, writing, failed, boundary, recent]) {
    expect(await priceCount(id)).toBe(1);
  }
  expect((await prunePriceBatch(env.MARKET, now)).rows).toBe(0);
  await cleanImportArtifactsBatch(env, now);
  // Raw CSVs are kept forever; the bucket lifecycle moves them to Infrequent Access.
  expect(await env.SNAPSHOTS.head('raw/expired.csv.gz')).not.toBeNull();
  expect(await env.SNAPSHOTS.head('normalized/expired/0.json')).toBeNull();
  expect(
    await env.MARKET.prepare('SELECT id FROM snapshots WHERE id=?').bind(expired).first(),
  ).toBeNull();
  expect(await env.SNAPSHOTS.head('normalized/stale/0.json')).toBeNull();
  expect(
    await env.MARKET.prepare('SELECT id FROM snapshots WHERE id=?').bind(stale).first(),
  ).not.toBeNull();
  for (const key of ['writing', 'failed', 'recent']) {
    expect(await env.SNAPSHOTS.head(`normalized/${key}/0.json`)).not.toBeNull();
  }
  expect((await cleanImportArtifactsBatch(env, now)).done).toBe(true);
  expect((await env.MARKET.prepare('PRAGMA foreign_key_check').all()).results).toEqual([]);
});

it('rejects days older than hot history and never reuses deleted numeric snapshot IDs', async () => {
  await expect(
    beginSnapshot(env.MARKET, {
      region: 'eu',
      version: 'seasonal',
      auctionHouseId: 12345,
      day: new Date(Date.now() - 15 * 86_400_000).toISOString().slice(0, 10),
    }),
  ).rejects.toThrow('14-day retention window');
  const old = await seed('id-reuse-old', '2026-07-01', 'complete', false);
  await env.MARKET.prepare('DELETE FROM snapshots WHERE id=?').bind(old).run();
  const next = await seed('id-reuse-new', '2026-09-13', 'writing', false);
  expect(next!).toBeGreaterThan(old!);
});

it('finishes metadata cleanup when a previous attempt stopped after committing artifact flags', async () => {
  const id = await seed('cleanup-retry', '2026-07-02', 'complete', false);
  await env.MARKET.batch([
    env.MARKET.prepare('DELETE FROM prices WHERE snapshot_id=?').bind(id),
    env.MARKET.prepare(
      'UPDATE snapshots SET prices_pruned_at=?,chunks_cleaned_at=? WHERE id=?',
    ).bind(now, now, id),
  ]);
  await env.SNAPSHOTS.delete([
    'normalized/cleanup-retry/0.json',
    'normalized/cleanup-retry/manifest.json',
  ]);
  await cleanImportArtifactsBatch(env, now);
  expect(
    await env.MARKET.prepare('SELECT id FROM snapshots WHERE id=?').bind(id).first(),
  ).toBeNull();
});
