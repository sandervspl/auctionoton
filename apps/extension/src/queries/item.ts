import * as i from 'types';
import dayjs from 'dayjs';
import { storage } from 'wxt/storage';
import { produce } from 'immer';

import { auctionotonAPIUrl, auctionotonAPI } from 'utils';
import { addItemToStorage, getItemsFromStorage } from '@/utils/storage';

export async function fetchItemFromAPI(
  itemId: number,
  auctionHouseId: number,
  version: i.GameVersion,
  amount = 1,
) {
  try {
    if (!auctionHouseId) {
      // @ts-ignore
      if (__DEV__) {
        throw new Error(
          `Invalid auction house id provided ("${auctionHouseId}") for item "${itemId}"`,
        );
      }

      return;
    }

    const { data } = await auctionotonAPI.get<i.ItemDataClassicResponse>(
      `${auctionotonAPIUrl}/item/${itemId}/ah/${auctionHouseId}/${version}`,
    );

    const localData: i.CachedItemDataClassic = {
      ...data,
      updatedAt: dayjs().toISOString(),
    };

    // Store in browser storage
    await addItemToStorage(auctionHouseId, itemId, localData);

    return localData;
  } catch (err: any) {
    console.error('fetchItemFromAPI', err.response?.status, err);

    if (err.response?.status === 404) {
      return 'NOT_FOUND';
    }
  }
}
