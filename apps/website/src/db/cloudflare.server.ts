import '@tanstack/react-start/server-only';
import type { BackendEnv } from '../../../../packages/infrastructure/alchemy.run';
import { websiteData } from '../../../cloudflare/src/website-data';
import type { HistoryCache } from '../../../cloudflare/src/website-data';

export type CloudflareBindings = Pick<
  BackendEnv,
  | 'MARKET'
  | 'USERS'
  | 'SEARCH_INDEXES'
  | 'HISTORY'
  | 'AUCTION_JOBS'
  | 'DAILY_ENABLED'
  | 'ENABLED_HOUSES'
>;

export async function getCloudflareBindings(): Promise<CloudflareBindings | null> {
  if (process.env.DATA_BACKEND !== 'd1') return null;
  const { env } = await import('cloudflare:workers');
  const bindings = env as CloudflareBindings;
  if (!bindings.MARKET || !bindings.USERS || !bindings.SEARCH_INDEXES)
    throw new Error('Website database bindings are missing');
  return bindings;
}

export async function getCloudflareData() {
  const bindings = await getCloudflareBindings();
  if (!bindings) return null;
  // Archived month slices are cached at the edge; the Cache API is absent in some local runs.
  const cache = (globalThis as { caches?: { default?: HistoryCache } }).caches?.default;
  return websiteData({ ...bindings, cache });
}
