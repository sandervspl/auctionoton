import type { Env } from './env';
import { replaceArchivedDay } from './history-archive';
import type { ArchivedPrice } from './history-archive';

type ArchiveEnv = Pick<Env, 'MARKET' | 'HISTORY'>;
const PAGE_ROWS = 5000;

/**
 * Copies a published snapshot's prices from D1 into its month's archive file and marks it
 * archived. Archived history therefore holds exactly what the website served.
 */
export async function archiveSnapshot(env: ArchiveEnv, storageId: number, now: string) {
  const snapshot = await env.MARKET.prepare(`SELECT id, house_key, day, fetched_at, expected_rows,
    status, archived_at, prices_pruned_at FROM snapshots WHERE id = ?`)
    .bind(storageId)
    .first<{
      id: number;
      house_key: string;
      day: string;
      fetched_at: string;
      expected_rows: number;
      status: string;
      archived_at: string | null;
      prices_pruned_at: string | null;
    }>();
  if (!snapshot || snapshot.status !== 'complete')
    throw new Error('Only published snapshots can be archived');
  if (snapshot.archived_at) return { archived: false, rows: 0 };
  if (snapshot.prices_pruned_at) throw new Error('Snapshot prices were pruned before archiving');
  const fetchedAt = Date.parse(snapshot.fetched_at);
  const rows: ArchivedPrice[] = [];
  for (let after = 0; ; ) {
    const page = await env.MARKET.prepare(`SELECT item_id AS itemId, min_buyout AS minBuyout,
      market_value AS marketValue, historical FROM prices
      WHERE snapshot_id = ? AND item_id > ? ORDER BY item_id LIMIT ?`)
      .bind(storageId, after, PAGE_ROWS)
      .all<Omit<ArchivedPrice, 'day' | 'fetchedAt'>>();
    for (const row of page.results) rows.push({ ...row, day: snapshot.day, fetchedAt });
    if (page.results.length < PAGE_ROWS) break;
    after = page.results.at(-1)!.itemId;
  }
  if (rows.length !== snapshot.expected_rows)
    throw new Error('Snapshot row count mismatch; archive refused');
  await replaceArchivedDay(env.HISTORY, snapshot.house_key, snapshot.day, rows);
  await env.MARKET.prepare(
    'UPDATE snapshots SET archived_at = ? WHERE id = ? AND archived_at IS NULL',
  )
    .bind(now, storageId)
    .run();
  return { archived: true, rows: rows.length };
}

/** Archives one published snapshot that is not yet archived, oldest first. */
export async function archivePendingSnapshot(env: ArchiveEnv, now: string) {
  const pending = await env.MARKET.prepare(`SELECT id FROM snapshots
    WHERE status = 'complete' AND archived_at IS NULL AND prices_pruned_at IS NULL
    ORDER BY day, id LIMIT 1`).first<{ id: number }>();
  if (!pending) return { rows: 0, done: true };
  const result = await archiveSnapshot(env, pending.id, now);
  return { rows: result.rows, done: false };
}
