import { createItemBatcher } from '@/utils/itemBatcher';
import { queryOptions } from '@tanstack/react-query';
import type { CachedItemDataClassic } from 'types';
import { auctionotonAPIUrl, auctionotonAPI } from '@/utils/auctionotonApi';
import { itemCache } from '@/utils/storage';
import { type ItemMarket, isItemData, itemQueryKey, ITEM_CACHE_LIFETIME } from '@/utils/itemCache';

const fetchBatchedItem = createItemBatcher(async (ids, market, signal) => {
  const { data } = await auctionotonAPI.get<{ items?: unknown[]; missingItemIds?: number[] }>(
    `${auctionotonAPIUrl}/items/ah/${market.auctionHouseId}/${market.version}`,
    { signal, timeout: 30_000, params: { region: market.region, ids: ids.join(',') } },
  );
  if (
    !Array.isArray(data?.items) ||
    !Array.isArray(data.missingItemIds) ||
    data.items.some((item) => !isItemData(item) || !ids.includes(item.itemId))
  ) {
    throw new Error('Invalid item response. Please try again.');
  }
  const fetched = new Map<number, CachedItemDataClassic>();
  for (const value of data.items) {
    if (isItemData(value))
      fetched.set(value.itemId, { ...value, updatedAt: new Date().toISOString() });
  }
  return fetched;
});

export async function fetchItemFromAPI(itemId: number, market: ItemMarket, signal?: AbortSignal) {
  const item = await fetchBatchedItem(itemId, market, signal);
  signal?.throwIfAborted();
  // A full or unavailable browser cache must not hide a successful API response.
  await itemCache.set(market, itemId, item).catch(() => undefined);
  return item;
}

export function itemQueryOptions(itemId: number, market: ItemMarket) {
  return queryOptions<CachedItemDataClassic>({
    queryKey: itemQueryKey(market, itemId),
    enabled: Number.isSafeInteger(itemId) && itemId > 0 && market.auctionHouseId > 0,
    retry: false,
    staleTime: (query) => {
      const updated = Date.parse(query.state.data?.updatedAt ?? '');
      return Number.isFinite(updated)
        ? Math.max(
            0,
            Math.min(30 * 60_000, updated + ITEM_CACHE_LIFETIME - query.state.dataUpdatedAt),
          )
        : 0;
    },
    queryFn: async ({ signal }) => {
      const cached = await itemCache.get(market, itemId).catch(() => undefined);
      signal.throwIfAborted();
      return cached ?? fetchItemFromAPI(itemId, market, signal);
    },
  });
}
