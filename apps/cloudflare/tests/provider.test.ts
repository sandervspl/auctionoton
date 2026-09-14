import { evictDurableObject } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, expect, it, vi } from 'vitest';
import { providerFetch, providerRetry } from '../src/provider';
import { archiveStream } from '../src/storage';

afterEach(() => vi.unstubAllGlobals());

it('archives an unknown-length stream across multiple R2 parts', async () => {
  let remaining = 6 * 1024 * 1024 + 17;
  const size = remaining;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!remaining) {
        controller.close();
        return;
      }
      const length = Math.min(32768, remaining);
      controller.enqueue(new Uint8Array(length).fill(65));
      remaining -= length;
    },
  });
  expect(await archiveStream(env.SNAPSHOTS, 'stream-test', body, {})).toBe(size);
  const stored = await env.SNAPSHOTS.get('stream-test');
  expect(stored?.size).toBe(size);
  expect((await stored!.text()).length).toBe(size);
});

it('aborts an interrupted stream without publishing a partial R2 object', async () => {
  let sent = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent) {
        controller.error(new Error('Network interrupted'));
        return;
      }
      sent = true;
      controller.enqueue(new Uint8Array(6 * 1024 * 1024));
    },
  });
  await expect(archiveStream(env.SNAPSHOTS, 'interrupted', body, {})).rejects.toThrow(
    'Network interrupted',
  );
  expect(await env.SNAPSHOTS.head('interrupted')).toBeNull();
});

it('keeps credential-specific tokens and throttles across Durable Object eviction', async () => {
  const fetcher = vi.fn(async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as { token: string };
    return Response.json({ access_token: `access-for-${body.token}`, expires_in: 3600 });
  });
  vi.stubGlobal('fetch', fetcher);
  const provider = env.PROVIDER.getByName('token-test');
  const [first, duplicate] = await Promise.all([
    provider.token('seasonal'),
    provider.token('seasonal'),
  ]);
  expect(first).toBe('access-for-test-seasonal-key');
  expect(duplicate).toBe(first);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await provider.token('classic')).toBe('access-for-test-classic-key');
  const until = Date.now() + 10 * 60_000;
  await provider.cooldown(until);
  await evictDurableObject(provider);
  expect(await provider.token('seasonal')).toBe(first);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(await provider.reserve()).toBeCloseTo(until - Date.now(), -2);
});

it('invalidates a rejected token and schedules long rate-limit waits durably', async () => {
  let tokenCalls = 0;
  let dataCalls = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/oauth2/token')) {
        tokenCalls++;
        return Response.json({ access_token: `token-${tokenCalls}`, expires_in: 3600 });
      }
      dataCalls++;
      return new Response(
        null,
        dataCalls === 1 ? { status: 401 } : { status: 429, headers: { 'Retry-After': '3600' } },
      );
    }),
  );
  await expect(providerFetch(env, 'hardcore', 'https://provider.example/ah/1')).rejects.toThrow(
    '401',
  );
  await expect(providerFetch(env, 'hardcore', 'https://provider.example/ah/1')).rejects.toThrow(
    '429',
  );
  expect(tokenCalls).toBe(2);
  const delay = await providerRetry(env, 'hardcore').retries.delay();
  expect(delay).toBeGreaterThan(3_590_000);
  await expect(providerFetch(env, 'hardcore', 'https://provider.example/ah/1')).rejects.toThrow(
    'cooldown',
  );
  expect(dataCalls).toBe(2);
});
