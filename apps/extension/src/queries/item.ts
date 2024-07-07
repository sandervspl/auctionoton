import * as i from 'types';
import dayjs from 'dayjs';

import asyncStorage from 'utils/asyncStorage';
import { auctionotonAPIUrl, auctionotonAPI } from 'utils/auctionotonApi';

export async function fetchItemFromAPI(
  itemId: number,
  auctionHouseId: number,
  version: i.GameVersion,
  amount = 1,
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
