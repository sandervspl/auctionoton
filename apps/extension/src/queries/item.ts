import * as i from 'types';
import { EdgeAPI } from '@project/constants';
import dayjs from 'dayjs';

import asyncStorage from 'utils/asyncStorage';
import { edgeAPI } from 'utils/edgeApi';

export async function fetchItemFromAPI(
  itemId: number,
  server: string,
  faction: string,
  queryKey: i.ItemQueryKeyCtx,
  amount = 1,
) {
  try {
    const { data } = await edgeAPI.get<i.ItemDataClassicResponse>(`${EdgeAPI.ItemUrl}/${itemId}`, {
      params: {
        server_name: server,
        faction: faction,
        amount,
      },
    });

    const localData: i.CachedItemDataClassic = {
      ...data,
      __version: 'classic',
      updatedAt: dayjs().toISOString(),
    };

    // Store in browser storage
    await asyncStorage.addItem(queryKey, localData);

    return localData;
  } catch (err) {
    console.error(err);
  }
}
