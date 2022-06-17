import * as i from 'types';
import axios from 'axios';
import dayjs from 'dayjs';
import { ItemBody } from '@project/validation';
import { API } from '@project/constants';

import asyncStorage from '../utils/asyncStorage';
import validateCache from '../utils/validateCache';


export async function fetchItem(
  queryKey: i.ItemQueryKey,
  memoUser: i.MemoUser,
  cb: (item: i.MaybeAnyItem) => void,
): Promise<i.MaybeAnyItem> {
  try {
  // Check browser storage if item is stored
    const itemFromStorage = await asyncStorage.getItem(queryKey);

    // Return whatever we find
    cb(itemFromStorage);

    if (validateCache(itemFromStorage)) {
      return itemFromStorage;
    }

    // If item from storage is stale, fetch item
    if (!memoUser.server || !memoUser.faction) {
      return;
    }

    const body: ItemBody = {
      server_name: memoUser.server,
      faction: memoUser.faction as i.Factions,
      amount: 1,
    };

    const { itemId } = queryKey[1];
    const { data } = await axios.post<i.ItemDataClassicResponse>(`${API.ItemsUrl}/${itemId}`, body, {
      params: {
        fields: 'itemId,uniqueName,stats',
      },
    });

    const cacheData: i.CachedItemDataClassic = {
      ...data,
      __version: 'classic',
      updatedAt: dayjs().toISOString(),
    };

    // Store in browser storage
    await asyncStorage.addItem(queryKey[1], cacheData);

    return cacheData;
  } catch (err) {
    console.error(err);

    throw new Error('Something went wrong fetching this item. Please try again.');
  }
}
