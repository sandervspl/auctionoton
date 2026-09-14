import { houseKey, parseJob, providerVersions } from './contracts';
import type { AuctionJob, ProviderRegion } from './contracts';
import type { Env } from './env';

export function enabledHouseJobs(
  env: Pick<Env, 'ENABLED_HOUSES' | 'TRIAL_REGION' | 'TRIAL_VERSION' | 'TRIAL_HOUSE_ID'>,
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
    const job = parseJob({ ...target, day });
    jobs.set(houseKey(job), job);
  }
  return [...jobs.values()];
}

export function discoverHouseJobs(catalog: { items: ProviderRegion[] }, selected: AuctionJob[]) {
  const found = new Map<string, AuctionJob>();
  for (const region of catalog.items) {
    for (const job of selected) {
      if (
        region.regionPrefix !== job.region ||
        region.gameVersion !== providerVersions[job.version]
      )
        continue;
      for (const realm of region.realms) {
        for (const house of realm.auctionHouses) {
          if (house.auctionHouseId !== job.auctionHouseId) continue;
          const milliseconds =
            house.lastModified < 1e12 ? house.lastModified * 1000 : house.lastModified;
          const modified =
            Number.isFinite(milliseconds) && milliseconds > 0
              ? new Date(milliseconds).toISOString()
              : null;
          const key = houseKey(job);
          const previous = found.get(key)?.providerModifiedAt;
          found.set(key, {
            ...job,
            providerModifiedAt:
              previous && (!modified || previous > modified) ? previous : modified,
          });
        }
      }
    }
  }
  for (const job of selected) {
    if (!found.has(houseKey(job)))
      throw new Error(
        `Configured auction house ${houseKey(job)} is absent from the provider catalog`,
      );
  }
  return [...found.values()];
}
