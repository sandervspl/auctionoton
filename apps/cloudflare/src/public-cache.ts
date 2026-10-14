import type { AuctionJob } from './contracts';
import { houseKey } from './contracts';

// Bound both browser and edge staleness, including during upstream failures.
export const PUBLIC_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, must-revalidate';
export const marketCacheTag = (key: string) => `market:${key}`;

export async function purgeMarketCache(cache: CacheContext | undefined, job: AuctionJob) {
  // Workers Cache is unavailable in workerd tests and local development.
  if (!cache) return { purged: false };
  const result = await cache.purge({ tags: [marketCacheTag(houseKey(job))] });
  if (!result.success) throw new Error('Market cache invalidation failed');
  return { purged: true };
}
