import type { Env } from './env';
import { oldestHotDay } from './history-archive';

export const MAINTENANCE_CRON = '30 4 * * *';
/** Raw provider CSVs move to R2 Infrequent Access after this many days and are kept forever. */
export const RAW_STANDARD_DAYS = 35;
export const CHUNK_RETENTION_DAYS = 7;
const DAY = 86_400_000;
const cutoff = (now: string, days: number) => new Date(Date.parse(now) - days * DAY).toISOString();

// Each Workflow step bounds its SQL work. Subsequent steps resume the backlog.
// Prices leave D1 only once archived history holds them; the latest published snapshot stays.
export async function prunePriceBatch(db: D1Database, now: string) {
  const day = oldestHotDay(now);
  let rows = 0;
  let snapshots = 0;
  for (let batch = 0; batch < 20; batch++) {
    const candidate = await db
      .prepare(`SELECT s.id FROM snapshots s
      WHERE s.status = 'complete' AND s.day < ? AND s.prices_pruned_at IS NULL
      AND s.archived_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM published_houses h WHERE h.snapshot_id = s.id)
      ORDER BY s.day LIMIT 1`)
      .bind(day)
      .first<{ id: number }>();
    if (!candidate) return { rows, snapshots, done: true };
    const results = await db.batch([
      db
        .prepare(`DELETE FROM prices WHERE snapshot_id = ? AND item_id IN
        (SELECT item_id FROM prices WHERE snapshot_id = ? LIMIT 1000)
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

/**
 * Removes normalized chunks a week after publication, then the snapshot record once its prices
 * have left D1. Raw provider CSVs are never deleted; a bucket lifecycle rule moves them to
 * Infrequent Access.
 */
export async function cleanImportArtifactsBatch(
  env: Pick<Env, 'MARKET' | 'SNAPSHOTS'>,
  now: string,
) {
  const chunkCutoff = cutoff(now, CHUNK_RETENTION_DAYS);
  const hotDay = oldestHotDay(now);
  const candidates = await env.MARKET.prepare(`SELECT s.id, s.snapshot_key, s.chunks_cleaned_at
    FROM snapshots s WHERE s.status = 'complete' AND (
      (s.completed_at < ? AND s.chunks_cleaned_at IS NULL) OR
      (s.day < ? AND s.prices_pruned_at IS NOT NULL AND s.chunks_cleaned_at IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM published_houses h WHERE h.snapshot_id = s.id)))
    ORDER BY s.id LIMIT 20`)
    .bind(chunkCutoff, hotDay)
    .all<{ id: number; snapshot_key: string; chunks_cleaned_at: string | null }>();
  let objects = 0;
  for (const row of candidates.results) {
    if (!row.chunks_cleaned_at) {
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
    // Archived history is now the record of which days exist for an auction house.
    await env.MARKET.prepare(`DELETE FROM snapshots WHERE id = ? AND snapshot_key = ? AND status = 'complete' AND day < ?
      AND prices_pruned_at IS NOT NULL AND chunks_cleaned_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM published_houses WHERE snapshot_id = ?)`)
      .bind(row.id, row.snapshot_key, hotDay, row.id)
      .run();
  }
  return { objects, done: candidates.results.length === 0 };
}
