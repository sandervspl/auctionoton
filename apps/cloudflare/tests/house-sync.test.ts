import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { expect, it, vi } from 'vitest';
import type { AuctionJob } from '../src/contracts';
import { syncHouseOnRequest } from '../src/house-sync';
import worker from '../src/index';
import { websiteData } from '../src/website-data';

// Requests are remembered per house and day for the whole test file, so each test uses its own
// catalog house: 361/362 Everlook (classic eu), 279/280 Atiesh (classic us), 183 Whitemane (era us).
const now = Date.parse('2026-11-27T10:00:00Z');
const queue = () => ({ send: vi.fn(async (_job: AuctionJob) => {}) });
const claimStatus = (key: string) =>
  env.MARKET.prepare('SELECT status FROM snapshots WHERE snapshot_key = ?')
    .bind(key)
    .first<string>('status');

it('queues the first request of the day per house and claims the snapshot', async () => {
  const jobs = queue();
  const bindings = { ...env, AUCTION_JOBS: jobs };
  expect(await syncHouseOnRequest(bindings, { auctionHouseId: 361, version: 'classic' }, now)).toBe(
    true,
  );
  expect(await syncHouseOnRequest(bindings, { auctionHouseId: 361 }, now)).toBe(false);
  expect(jobs.send).toHaveBeenCalledExactlyOnceWith({
    region: 'eu',
    version: 'classic',
    auctionHouseId: 361,
    day: '2026-11-27',
  });
  expect(await claimStatus('classic-eu-361-2026-11-27')).toBe('writing');
  // The next day is a new claim.
  expect(await syncHouseOnRequest(bindings, { auctionHouseId: 361 }, now + 86_400_000)).toBe(true);
  expect(jobs.send).toHaveBeenCalledTimes(2);
});

it('leaves a house alone when another isolate or the daily run already started today', async () => {
  await env.MARKET.prepare(`INSERT INTO snapshots
    (snapshot_key, house_key, region, version, auction_house_id, day, status)
    VALUES ('classic-eu-362-2026-11-27', 'classic-eu-362', 'eu', 'classic', 362, '2026-11-27', 'failed')`).run();
  const jobs = queue();
  expect(
    await syncHouseOnRequest({ ...env, AUCTION_JOBS: jobs }, { auctionHouseId: 362 }, now),
  ).toBe(false);
  expect(jobs.send).not.toHaveBeenCalled();
});

it('ignores uncatalogued houses, mismatched markets and daily-scheduled houses', async () => {
  const jobs = queue();
  const bindings = { ...env, AUCTION_JOBS: jobs };
  expect(await syncHouseOnRequest(bindings, { auctionHouseId: 999_999 }, now)).toBe(false);
  expect(await syncHouseOnRequest(bindings, { auctionHouseId: 279, version: 'era' }, now)).toBe(
    false,
  );
  expect(await syncHouseOnRequest(bindings, { auctionHouseId: 279, region: 'eu' }, now)).toBe(
    false,
  );
  const scheduled = {
    ...bindings,
    DAILY_ENABLED: 'true',
    ENABLED_HOUSES: JSON.stringify([{ version: 'classic', region: 'us', auctionHouseId: 279 }]),
  };
  expect(await syncHouseOnRequest(scheduled, { auctionHouseId: 279 }, now)).toBe(false);
  expect(jobs.send).not.toHaveBeenCalled();
  expect(await claimStatus('classic-us-279-2026-11-27')).toBeNull();
});

it('releases the claim when queueing fails so a later request retries', async () => {
  const jobs = queue();
  jobs.send.mockRejectedValueOnce(new Error('Queue unavailable'));
  const bindings = { ...env, AUCTION_JOBS: jobs };
  await expect(syncHouseOnRequest(bindings, { auctionHouseId: 280 }, now)).rejects.toThrow(
    'Queue unavailable',
  );
  expect(await claimStatus('classic-us-280-2026-11-27')).toBeNull();
  expect(await syncHouseOnRequest(bindings, { auctionHouseId: 280 }, now)).toBe(true);
});

it('syncs from the public item routes and the website item page without failing them', async () => {
  const day = new Date().toISOString().slice(0, 10);
  const jobs = queue();
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request('https://trial.example.com/items/ah/183/era?region=us&ids=1'),
    { ...env, AUCTION_JOBS: jobs as unknown as typeof env.AUCTION_JOBS },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  expect(response.status).toBe(200);
  expect(jobs.send).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ auctionHouseId: 183, version: 'era', region: 'us', day }),
  );

  const broken = queue();
  broken.send.mockRejectedValue(new Error('Queue unavailable'));
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const page = websiteData({ ...env, AUCTION_JOBS: broken });
  expect(await page.history(1, 184, 'us')).toEqual({ points: [], archiveUnavailable: false });
  expect(broken.send).toHaveBeenCalledOnce();
  expect(error).toHaveBeenCalledWith('On-request house sync failed', expect.anything());
  error.mockRestore();
});
