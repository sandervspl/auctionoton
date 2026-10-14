import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import {
  createItemCache,
  isFreshItem,
  isItemData,
  itemStorageKey,
  itemQueryKey,
  ITEM_CACHE_LIFETIME,
  type ItemMarket,
  type ItemStorage,
} from '../src/utils/itemCache.ts';
import { syncStorageChanges } from '../src/utils/storageChanges.ts';
import type { CachedItemDataClassic } from '../src/types';

const market: ItemMarket = { region: 'eu', version: 'seasonal', auctionHouseId: 509 };
const item = (itemId: number, updatedAt = new Date().toISOString()) =>
  ({
    itemId,
    name: 'Cloth',
    uniqueName: 'cloth',
    updatedAt,
    stats: {
      lastUpdated: updatedAt,
      current: {
        minBuyout: 100,
        marketValue: 120,
        historicalValue: 110,
        quantity: 2,
        numAuctions: 1,
      },
    },
  }) as CachedItemDataClassic;

function fixture() {
  const values: Record<string, unknown> = {};
  const storage: ItemStorage = {
    async get(key) {
      return structuredClone(key === null ? values : { [key]: values[key] });
    },
    async set(next) {
      Object.assign(values, structuredClone(next));
    },
    async remove(keys) {
      for (const key of keys) Reflect.deleteProperty(values, key);
    },
  };
  return { values, cache: createItemCache(storage) };
}

test('concurrent writes preserve both prices without reading the whole cache', async () => {
  const { cache, values } = fixture();
  await Promise.all([cache.set(market, 1, item(1)), cache.set(market, 2, item(2))]);
  assert.equal(Object.keys(values).length, 2);
  assert.equal((await cache.get(market, 1))?.itemId, 1);
  assert.equal((await cache.get(market, 2))?.itemId, 2);
});

test('cache and query identities isolate region and game version', async () => {
  const { cache } = fixture();
  await cache.set(market, 1, item(1));
  for (const other of [
    { ...market, region: 'us' as const },
    { ...market, version: 'era' as const },
  ]) {
    assert.equal(await cache.get(other, 1), undefined);
    assert.notDeepEqual(itemQueryKey(other, 1), itemQueryKey(market, 1));
  }
});

test('expired, future-dated, mismatched and error responses never become valid price data', async () => {
  const { cache, values } = fixture();
  const expired = item(1, new Date(Date.now() - ITEM_CACHE_LIFETIME - 1).toISOString());
  assert.equal(isFreshItem(expired), false);
  assert.equal(isFreshItem(item(1, new Date(Date.now() + 60_000).toISOString())), false);
  assert.equal(isItemData({ error: true, reason: 'Item not found' }), false);
  values[itemStorageKey(market, 1)] = expired;
  assert.equal(await cache.get(market, 1), undefined);
  values[itemStorageKey(market, 1)] = item(2);
  assert.equal(await cache.get(market, 1), undefined);
  await assert.rejects(cache.set(market, 1, item(2)), /Invalid cached item/);
});

test('pruning drops obsolete prices and the unscoped legacy cache while preserving settings', async () => {
  const { cache, values } = fixture();
  values.items = { '509:1': item(1) };
  values.user = { region: 'eu' };
  values[itemStorageKey(market, 1)] = item(1, '2020-01-01T00:00:00Z');
  await cache.set(market, 2, item(2));
  await cache.prune();
  assert.deepEqual(Object.keys(values).sort(), [itemStorageKey(market, 2), 'user'].sort());
});

test('price writes do not refetch inactive queries; settings changes update only their cache entry', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
  });
  let requests = 0;
  await client.fetchQuery({
    queryKey: itemQueryKey(market, 1),
    queryFn: async () => {
      requests++;
      return item(1);
    },
  });
  for (let i = 0; i < 10; i++)
    syncStorageChanges(client, { [itemStorageKey(market, 1)]: { newValue: item(1) } }, 'local');
  syncStorageChanges(client, { user: { newValue: { region: 'us' } } }, 'local');
  assert.deepEqual(client.getQueryData(['storage', 'user']), { region: 'us' });
  syncStorageChanges(client, { user: { newValue: {} } }, 'sync');
  assert.deepEqual(client.getQueryData(['storage', 'user']), { region: 'us' });
  assert.equal(requests, 1);
  client.clear();
});
