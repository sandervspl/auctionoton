import * as i from 'types';
import dayjs from 'dayjs';
import { queryOptions, UseQueryOptions } from '@tanstack/react-query';

import asyncStorage from 'utils/asyncStorage';
import { auctionotonAPIUrl, auctionotonAPI } from 'utils/auctionotonApi';
import validateCache from 'utils/validateCache';

export const itemQueryOptions = (
  auctionHouseId: number,
  itemId: number,
  version: i.GameVersion,
  options?: { enabled?: boolean; retry?: boolean; retryOnMount?: boolean },
) =>
  queryOptions({
    queryKey: ['item', auctionHouseId, itemId],
    refetchOnWindowFocus: true,
    retry: false, // Let user retry on demand with button
    enabled: !!auctionHouseId && !!itemId,
    queryFn: async () => {
      if (auctionHouseId == null || auctionHouseId <= 0) {
        return;
      }

      // Check browser storage if item is stored
      const itemFromStorage = await asyncStorage.getItem([auctionHouseId, itemId]);

      // If found, set it as the item
      if (validateCache(itemFromStorage)) {
        return itemFromStorage;
      }

      const result = await fetchItemFromAPI(itemId, auctionHouseId!, version);

      if (result == null) {
        throw new Error('Something went wrong fetching this item. Please try again.');
      }

      if (result === 'NOT_FOUND') {
        throw new Error('Item not found. This item might not be available on this realm.');
      }

      return result;
    },
    ...options,
  });

export async function fetchItemFromAPI(
  itemId: number,
  auctionHouseId: number,
  version: i.GameVersion,
) {
  try {
    if (!auctionHouseId) {
      if (__DEV__) {
        throw new Error(
          `Invalid auction house id provided ("${auctionHouseId}") for item "${itemId}"`,
        );
      }

      return;
    }

    const { data, status } = await auctionotonAPI.get<i.ItemDataClassicResponse>(
      `${auctionotonAPIUrl}/item/${itemId}/ah/${auctionHouseId}/${version}`,
    );

    const localData: i.CachedItemDataClassic = {
      ...data,
      updatedAt: dayjs().toISOString(),
    };

    // Store in browser storage
    await asyncStorage.addItem([auctionHouseId, itemId], localData);

    return localData;
  } catch (err: any) {
    console.error('fetchItemFromAPI', err.response?.status, err);

    if (err.response?.status === 404) {
      return 'NOT_FOUND';
    }
  }
}
