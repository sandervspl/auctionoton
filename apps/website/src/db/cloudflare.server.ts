import '@tanstack/react-start/server-only';
import type { BackendEnv } from '../../../../packages/infrastructure/alchemy.run';
import { websiteData } from '../../../cloudflare/src/website-data';
import type { HistoryCache } from '../../../cloudflare/src/website-data';

export async function getCloudflareData() {
  if (process.env.DATA_BACKEND !== 'd1') return null;
  const { env } = await import('cloudflare:workers');
  const bindings = env as Pick<
    BackendEnv,
    'MARKET' | 'USERS' | 'HISTORY' | 'AUCTION_JOBS' | 'DAILY_ENABLED' | 'ENABLED_HOUSES'
  >;
  if (!bindings.MARKET || !bindings.USERS) throw new Error('Website database bindings are missing');
  // Archived month slices are cached at the edge; the Cache API is absent in some local runs.
  const cache = (globalThis as { caches?: { default?: HistoryCache } }).caches?.default;
  return websiteData({ ...bindings, cache });
}
