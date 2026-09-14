import { env } from 'cloudflare:workers';
import { beforeAll, expect, it, vi } from 'vitest';
import worker from '../src/index';
import { readPublicItems } from '../src/public-items';
import { PUBLIC_CACHE_CONTROL } from '../src/public-cache';

beforeAll(async () => {
  for (const [region, value] of [
    ['eu', 100],
    ['us', 200],
  ] as const) {
    const key = `seasonal-${region}-907`;
    const id = await env.MARKET.prepare(`INSERT INTO snapshots
      (snapshot_key, house_key, region, version, auction_house_id, day, status, fetched_at)
      VALUES (?, ?, ?, 'seasonal', 907, '2026-09-14', 'complete', '2026-09-14T04:00:00Z') RETURNING id`)
      .bind(key, key, region)
      .first<number>('id');
    await env.MARKET.prepare("INSERT INTO published_houses VALUES (?, ?, '2026-09-14')")
      .bind(key, id)
      .run();
    await env.MARKET.batch(
      Array.from({ length: 50 }, (_, index) =>
        env.MARKET.prepare('INSERT INTO prices VALUES (?, ?, 0, ?, 2, 120, 110, 1)').bind(
          id,
          index + 1,
          value,
        ),
      ),
    );
    await env.MARKET.prepare('INSERT INTO prices VALUES (?, 1, 42, 999, 2, 120, 110, 1)')
      .bind(id)
      .run();
  }
  await env.MARKET.prepare(
    "INSERT OR REPLACE INTO item_metadata(id, name, slug, icon) VALUES (1, 'Cloth', 'cloth', 'inv_fabric_linen_01')",
  ).run();
});
const request = (path: string) =>
  worker.fetch(new Request(`https://trial.example.com${path}`), env);

it('fetches a full 50-item batch with metadata using one D1 query', async () => {
  const prepare = vi.fn((sql: string) => env.MARKET.prepare(sql));
  const result = await readPublicItems(
    { prepare },
    { auctionHouseId: 907, region: 'eu', version: 'seasonal' },
    Array.from({ length: 50 }, (_, index) => index + 1),
  );
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(result.items).toHaveLength(50);
  expect(result.missingItemIds).toEqual([]);
  expect(result.items[0]).toMatchObject({ name: 'Cloth', stats: { current: { minBuyout: 100 } } });
  expect(result.items[0].icon).toContain('inv_fabric_linen_01.jpg');
});
it('isolates regions, deduplicates IDs and returns explicit partial misses', async () => {
  const response = await request('/items/ah/907/seasonal?region=us&ids=1,2,1,999');
  expect(response.status).toBe(200);
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  expect(response.headers.get('Cache-Control')).toBe(PUBLIC_CACHE_CONTROL);
  expect(response.headers.get('Cache-Tag')).toBe('market:seasonal-us-907');
  expect(await response.json()).toMatchObject({
    items: [{ itemId: 1, stats: { current: { minBuyout: 200 } } }, { itemId: 2 }],
    missingItemIds: [999],
  });
});
it('keeps single-item compatibility, detects ambiguous regions and returns uncached 404s', async () => {
  expect((await request('/item/1/ah/907/seasonal')).status).toBe(409);
  const response = await request('/item/1/ah/907/seasonal?region=eu');
  expect(response.headers.get('Cache-Tag')).toBe('market:seasonal-eu-907');
  expect(await response.json()).toMatchObject({
    itemId: 1,
    name: 'Cloth',
    stats: { current: { minBuyout: 100 } },
  });
  const missing = await request('/item/999/ah/907/seasonal?region=eu');
  expect(missing.status).toBe(404);
  expect(missing.headers.get('Cache-Control')).toBe('no-store');
});
it.each([
  '/items/ah/907/seasonal?ids=1',
  '/items/ah/907/seasonal?region=xx&ids=1',
  '/items/ah/907/seasonal?region=eu&ids=',
  '/items/ah/907/seasonal?region=eu&ids=1.5',
  '/items/ah/907/seasonal?region=eu&ids=0',
  '/items/ah/907/retail?region=eu&ids=1',
  `/items/ah/907/seasonal?region=eu&ids=${Array.from({ length: 51 }, (_, index) => index + 1).join(',')}`,
])('rejects invalid or oversized batches: %s', async (path) => {
  expect((await request(path)).status).toBe(400);
});
