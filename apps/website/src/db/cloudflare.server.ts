import '@tanstack/react-start/server-only';
import type { BackendEnv } from '../../../../packages/infrastructure/alchemy.run';
import { websiteData } from '../../../cloudflare/src/website-data';

export type CloudflareBindings = Pick<BackendEnv, 'MARKET' | 'USERS' | 'SEARCH_INDEXES'>;

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
  return bindings ? websiteData(bindings) : null;
}
