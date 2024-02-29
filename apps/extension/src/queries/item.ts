import * as i from 'types';
import dayjs from 'dayjs';

import asyncStorage from 'utils/asyncStorage';
import { EdgeAPI, edgeAPI } from 'utils/edgeApi';

export async function fetchItemFromAPI(itemId: number, auctionHouseId: number, amount = 1) {
  try {
    if (!auctionHouseId) {
      if (__DEV__) {
        throw new Error(
          `Invalid auction house id provided ("${auctionHouseId}") for item "${itemId}"`,
        );
      }

      return;
    }

    const { data } = await edgeAPI.get<i.ItemDataClassicResponse>(
      `${EdgeAPI.Url}/item/${itemId}/ah/${auctionHouseId}`,
    );

    const localData: i.CachedItemDataClassic = {
      ...data,
      updatedAt: dayjs().toISOString(),
    };

    // Store in browser storage
    await asyncStorage.addItem([auctionHouseId, itemId], localData);

    return localData;
  } catch (err) {
    console.error(err);
  }
}
