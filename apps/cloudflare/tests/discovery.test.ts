import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import type { ProviderRegion } from '../src/contracts';
import { discoverHouseJobs, enabledHouseJobs } from '../src/discovery';

it('deduplicates connected realm references while retaining separate faction and region markets', () => {
  const targets = [
    { region: 'eu', version: 'seasonal', auctionHouseId: 509 },
    { region: 'eu', version: 'seasonal', auctionHouseId: 509 },
    { region: 'eu', version: 'seasonal', auctionHouseId: 510 },
    { region: 'us', version: 'seasonal', auctionHouseId: 509 },
  ];
  const jobs = enabledHouseJobs({ ...env, ENABLED_HOUSES: JSON.stringify(targets) }, '2026-09-14');
  expect(jobs).toHaveLength(3);
  const realm = {
    realmId: 1,
    name: 'One',
    localizedName: 'One',
    locale: 'en_US',
    auctionHouses: [
      { auctionHouseId: 509, type: 'Alliance', lastModified: 1750000000 },
      { auctionHouseId: 510, type: 'Horde', lastModified: 0 },
    ],
  };
  const catalog: { items: ProviderRegion[] } = {
    items: [
      {
        regionPrefix: 'eu',
        gameVersion: 'Season of Discovery',
        realms: [realm, { ...realm, realmId: 2 }],
      },
      { regionPrefix: 'us', gameVersion: 'Season of Discovery', realms: [realm] },
    ],
  };
  const discovered = discoverHouseJobs(catalog, jobs);
  expect(discovered).toHaveLength(3);
  expect(discovered.find((job) => job.auctionHouseId === 510)?.providerModifiedAt).toBeNull();
  expect(discovered.find((job) => job.auctionHouseId === 509)?.providerModifiedAt).toBe(
    new Date(1750000000000).toISOString(),
  );
  expect(() => discoverHouseJobs({ items: [] }, jobs)).toThrow('absent');
  expect(enabledHouseJobs(env, '2026-09-14')).toHaveLength(1);
});
