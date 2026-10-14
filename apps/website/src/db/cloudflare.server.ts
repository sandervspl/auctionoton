import '@tanstack/react-start/server-only';
import type { BackendEnv } from '../../../../packages/infrastructure/alchemy.run';
import { websiteData } from '../../../cloudflare/src/website-data';

export async function getCloudflareData() {
  if (process.env.DATA_BACKEND !== 'd1') return null;
  const { env } = await import('cloudflare:workers');
  const bindings = env as Pick<BackendEnv, 'MARKET' | 'USERS'>;
  if (!bindings.MARKET || !bindings.USERS) throw new Error('Website database bindings are missing');
  return websiteData(bindings);
}
