import type { Env } from './env';

export const MAINTENANCE_CRON = '30 4 * * *';
export const PRICE_RETENTION_DAYS = 30;
export const RAW_RETENTION_DAYS = 35;
export const CHUNK_RETENTION_DAYS = 7;
const DAY = 86_400_000;
const cutoff = (now: string, days: number) => new Date(Date.parse(now) - days * DAY).toISOString();

export const oldestPriceDay = (now: string) => cutoff(now, PRICE_RETENTION_DAYS).slice(0, 10);

// Each Workflow step bounds its SQL work. Subsequent steps resume the backlog.
export async function prunePriceBatch(db: D1Database, now: string) {
  const day = oldestPriceDay(now);
  let rows = 0;
  let snapshots = 0;
  for (let batch = 0; batch < 20; batch++) {
    const candidate = await db
      .prepare(`SELECT s.id FROM snapshots s
      WHERE s.status = 'complete' AND s.day < ? AND s.prices_pruned_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM published_houses h WHERE h.snapshot_id = s.id)
      ORDER BY s.day LIMIT 1`)
      .bind(day)
      .first<{ id: number }>();
    if (!candidate) return { rows, snapshots, done: true };
    const results = await db.batch([
      db
        .prepare(`DELETE FROM prices WHERE snapshot_id = ? AND (item_id, pet_species_id) IN
        (SELECT item_id, pet_species_id FROM prices WHERE snapshot_id = ? LIMIT 1000)
        AND NOT EXISTS (SELECT 1 FROM published_houses WHERE snapshot_id = ?)`)
        .bind(candidate.id, candidate.id, candidate.id),
      db
        .prepare(`UPDATE snapshots SET prices_pruned_at = ? WHERE id = ?
        AND NOT EXISTS (SELECT 1 FROM prices WHERE snapshot_id = ?)
        AND NOT EXISTS (SELECT 1 FROM published_houses WHERE snapshot_id = ?)`)
        .bind(now, candidate.id, candidate.id, candidate.id),
    ]);
    rows += results[0]!.meta.changes;
    snapshots += results[1]!.meta.changes;
  }
  return { rows, snapshots, done: false };
}

export async function cleanArchiveBatch(env: Pick<Env, 'MARKET' | 'SNAPSHOTS'>, now: string) {
  const chunkCutoff = cutoff(now, CHUNK_RETENTION_DAYS);
  const rawDay = cutoff(now, RAW_RETENTION_DAYS).slice(0, 10);
  const candidates = await env.MARKET.prepare(`SELECT s.id, s.snapshot_key, s.raw_key,
      s.completed_at, s.chunks_cleaned_at,
      (s.day < ? AND s.prices_pruned_at IS NOT NULL AND s.raw_cleaned_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM published_houses h WHERE h.snapshot_id = s.id)) AS remove_raw
    FROM snapshots s WHERE s.status = 'complete' AND (
      (s.completed_at < ? AND s.chunks_cleaned_at IS NULL) OR
      (s.day < ? AND s.prices_pruned_at IS NOT NULL AND s.raw_cleaned_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM published_houses h WHERE h.snapshot_id = s.id)) OR
      (s.day < ? AND s.prices_pruned_at IS NOT NULL AND s.raw_cleaned_at IS NOT NULL
       AND s.chunks_cleaned_at IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM published_houses h WHERE h.snapshot_id = s.id)))
    ORDER BY s.id LIMIT 20`)
    .bind(rawDay, chunkCutoff, rawDay, rawDay)
    .all<{
      id: number;
      snapshot_key: string;
      raw_key: string | null;
      completed_at: string;
      chunks_cleaned_at: string | null;
      remove_raw: number;
    }>();
  let objects = 0;
  for (const row of candidates.results) {
    if (!row.chunks_cleaned_at && row.completed_at < chunkCutoff) {
      // Only completed publications qualify. Active/failed Workflows keep their
      // normalized input, including cached normalization steps waiting to resume.
      const page = await env.SNAPSHOTS.list({
        prefix: `normalized/${row.snapshot_key}/`,
        limit: 1000,
      });
      if (page.objects.length) await env.SNAPSHOTS.delete(page.objects.map((object) => object.key));
      objects += page.objects.length;
      if (!page.truncated)
        await env.MARKET.prepare(
          "UPDATE snapshots SET chunks_cleaned_at = ? WHERE id = ? AND snapshot_key = ? AND status = 'complete'",
        )
          .bind(now, row.id, row.snapshot_key)
          .run();
    }
    if (row.remove_raw) {
      if (row.raw_key) {
        await env.SNAPSHOTS.delete(row.raw_key);
        objects++;
      }
      await env.MARKET.prepare(
        "UPDATE snapshots SET raw_cleaned_at = ? WHERE id = ? AND snapshot_key = ? AND status = 'complete'",
      )
        .bind(now, row.id, row.snapshot_key)
        .run();
    }
    await env.MARKET.prepare(`DELETE FROM snapshots WHERE id = ? AND snapshot_key = ? AND status = 'complete' AND day < ?
      AND prices_pruned_at IS NOT NULL AND chunks_cleaned_at IS NOT NULL AND raw_cleaned_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM published_houses WHERE snapshot_id = ?)`)
      .bind(row.id, row.snapshot_key, rawDay, row.id)
      .run();
  }
  return { objects, done: candidates.results.length === 0 };
}
