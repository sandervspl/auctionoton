import * as i from 'types';
import dayjs from 'dayjs';

import asyncStorage from 'utils/asyncStorage';
import { EdgeAPI, edgeAPI } from 'utils/edgeApi';

export async function fetchItemFromAPI(
  itemId: number,
  server: string,
  faction: string,
  region: string,
  isEra: boolean,
  queryKey: i.ItemQueryKeyCtx,
  amount = 1,
) {
  try {
    const { data } = await edgeAPI.get<i.ItemDataClassicResponse>(`${EdgeAPI.ItemUrl}/${itemId}`, {
      params: {
        server_name: server,
        region,
        faction: faction,
        version: isEra ? 'era' : 'classic',
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
