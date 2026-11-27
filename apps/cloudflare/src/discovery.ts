import { houseKey, parseJob } from './contracts';
import type { AuctionJob } from './contracts';
import type { Env } from './env';
import { auctionHouseCsvUrl, realmCatalog } from './realms';

export function enabledHouseJobs(
  env: Partial<Pick<Env, 'ENABLED_HOUSES' | 'TRIAL_REGION' | 'TRIAL_VERSION' | 'TRIAL_HOUSE_ID'>>,
  day: string,
): AuctionJob[] {
  const configured: unknown = env.ENABLED_HOUSES
    ? JSON.parse(env.ENABLED_HOUSES)
    : [
        {
          region: env.TRIAL_REGION,
          version: env.TRIAL_VERSION,
          auctionHouseId: Number(env.TRIAL_HOUSE_ID),
        },
      ];
  if (!Array.isArray(configured) || !configured.length || configured.length > 250)
    throw new Error('Configure between 1 and 250 auction houses');
  const jobs = new Map<string, AuctionJob>();
  for (const target of configured) {
    const job = parseJob({ ...(target as object), day });
    jobs.set(houseKey(job), job);
  }
  return [...jobs.values()];
}

/** Rejects configured houses the realm catalog cannot map to a TSM public CSV file. */
export function discoverHouseJobs(selected: AuctionJob[], catalog = realmCatalog) {
  for (const job of selected) {
    if (!auctionHouseCsvUrl(job, catalog))
      throw new Error(`Configured auction house ${houseKey(job)} is absent from the realm catalog`);
  }
  return selected;
}
