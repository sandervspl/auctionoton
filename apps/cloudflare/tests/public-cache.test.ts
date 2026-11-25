import { createExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { expect, it, vi } from 'vitest';
import worker from '../src/index';
import { purgeMarketCache } from '../src/public-cache';
import type { AuctionJob } from '../src/contracts';

const job: AuctionJob = {
  region: 'eu',
  version: 'seasonal',
  auctionHouseId: 509,
  day: '2026-09-14',
};
const contextWithCache = (purge: CacheContext['purge']) => {
  const ctx = createExecutionContext();
  Object.defineProperty(ctx, 'cache', { value: { purge } });
  return ctx;
};
const request = (body: unknown = job, token = env.ADMIN_TOKEN) =>
  new Request('https://trial.example.com/admin/cache/market', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

it('purges only the published market through the API entrypoint', async () => {
  const purge = vi.fn(async () => ({ success: true, errors: [] }));
  const response = await worker.fetch(request(), env, contextWithCache(purge));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ purged: true });
  expect(purge).toHaveBeenCalledExactlyOnceWith({ tags: ['market:seasonal-eu-509'] });
  expect(response.headers.get('Cache-Control')).toContain('no-store');
});

it('requires authorization and a valid market before purging', async () => {
  const purge = vi.fn(async () => ({ success: true, errors: [] }));
  const ctx = contextWithCache(purge);
  expect((await worker.fetch(request(job, 'wrong-token'), env, ctx)).status).toBe(401);
  expect((await worker.fetch(request({ ...job, region: 'xx' }), env, ctx)).status).toBe(400);
  expect(purge).not.toHaveBeenCalled();
});

it('returns retryable uncached failures if cache invalidation fails', async () => {
  const purge = vi.fn(async () => ({
    success: false,
    errors: [{ code: 1, message: 'Unavailable' }],
  }));
  const response = await worker.fetch(request(), env, contextWithCache(purge));
  expect(response.status).toBe(503);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});

it('allows local workflows where Workers Cache is unavailable', async () => {
  expect(await purgeMarketCache(undefined, job)).toEqual({ purged: false });
});

it.each([
  '/health',
  '/unknown',
  '/api/session',
  '/admin/status',
  '/realms/xx/era',
  '/item/0/ah/509/seasonal',
])('does not cache private, default or error responses: %s', async (path) => {
  const response = await worker.fetch(new Request(`https://trial.example.com${path}`), env);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
});
