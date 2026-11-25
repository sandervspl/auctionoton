import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import { discoverHouseJobs, enabledHouseJobs } from '../src/discovery';

it('deduplicates configured houses while retaining separate faction and region markets', () => {
  const targets = [
    { region: 'eu', version: 'seasonal', auctionHouseId: 509 },
    { region: 'eu', version: 'seasonal', auctionHouseId: 509 },
    { region: 'eu', version: 'seasonal', auctionHouseId: 510 },
    { region: 'us', version: 'seasonal', auctionHouseId: 509 },
  ];
  const jobs = enabledHouseJobs({ ...env, ENABLED_HOUSES: JSON.stringify(targets) }, '2026-09-14');
  expect(jobs).toHaveLength(3);
  // Wild Growth's houses exist in EU Season of Discovery, not US.
  expect(() => discoverHouseJobs(jobs)).toThrow('seasonal-us-509');
  const eu = jobs.filter((job) => job.region === 'eu');
  expect(discoverHouseJobs(eu)).toEqual(eu);
  expect(enabledHouseJobs(env, '2026-09-14')).toHaveLength(1);
});
