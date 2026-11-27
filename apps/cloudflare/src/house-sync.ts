import type { D1Database } from '@cloudflare/workers-types';
import { houseKey, snapshotId } from './contracts';
import type { AuctionJob, Region, Version } from './contracts';
import { enabledHouseJobs } from './discovery';
import type { Env } from './env';
import { findAuctionHouse } from './realms';

// Stopgap until every auction house is imported daily: a house the daily cron skips gets today's
// snapshot the first time anyone requests one of its items that day.

export type HouseSyncBindings = {
  MARKET: Pick<D1Database, 'prepare'>;
  AUCTION_JOBS: { send(job: AuctionJob): Promise<unknown> };
} & Partial<
  Pick<
    Env,
    'DAILY_ENABLED' | 'ENABLED_HOUSES' | 'TRIAL_REGION' | 'TRIAL_VERSION' | 'TRIAL_HOUSE_ID'
  >
>;
type HouseRequest = { auctionHouseId: number; version?: Version; region?: Region };

// Requests in one isolate share this, so only the first per house and day touches D1.
let requested = { day: '', keys: new Set<string>() };

/** The daily cron already imports these houses, at its own fixed time. */
function scheduledDaily(env: HouseSyncBindings, job: AuctionJob) {
  if (env.DAILY_ENABLED !== 'true') return false;
  return enabledHouseJobs(env, job.day).some((target) => houseKey(target) === houseKey(job));
}

/**
 * Queues today's import of the requested auction house unless one was already started today.
 * Returns whether this call queued it. Houses absent from the realm catalog are ignored.
 */
export async function syncHouseOnRequest(
  env: HouseSyncBindings,
  request: HouseRequest,
  now = Date.now(),
) {
  const house = findAuctionHouse(request.auctionHouseId);
  if (
    !house ||
    (request.version && house.version !== request.version) ||
    (request.region && house.region !== request.region)
  )
    return false;
  const day = new Date(now).toISOString().slice(0, 10);
  const job: AuctionJob = {
    region: house.region,
    version: house.version,
    auctionHouseId: request.auctionHouseId,
    day,
  };
  const key = snapshotId(job);
  if (requested.day !== day) requested = { day, keys: new Set() };
  if (requested.keys.has(key)) return false;
  requested.keys.add(key);
  try {
    if (scheduledDaily(env, job)) return false;
    // The snapshot row claims the day's import across isolates; AuctionImport resumes from it.
    const claim = await env.MARKET.prepare(`INSERT INTO snapshots
      (snapshot_key, house_key, region, version, auction_house_id, day, status)
      VALUES (?, ?, ?, ?, ?, ?, 'writing') ON CONFLICT DO NOTHING`)
      .bind(key, houseKey(job), job.region, job.version, job.auctionHouseId, day)
      .run();
    if (!claim.meta.changes) return false;
    try {
      await env.AUCTION_JOBS.send(job);
    } catch (error) {
      // Release the claim so a later request can queue the import again.
      await env.MARKET.prepare(
        "DELETE FROM snapshots WHERE snapshot_key = ? AND status = 'writing'",
      )
        .bind(key)
        .run();
      throw error;
    }
    return true;
  } catch (error) {
    requested.keys.delete(key);
    throw error;
  }
}

/** Logs instead of failing: a sync problem must never break the price response. */
export const syncHouseQuietly = (env: HouseSyncBindings, request: HouseRequest) =>
  syncHouseOnRequest(env, request).catch((error: unknown) => {
    console.error('On-request house sync failed', {
      auctionHouseId: request.auctionHouseId,
      error: String(error),
    });
    return false;
  });
