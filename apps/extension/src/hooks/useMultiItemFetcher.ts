import * as i from 'types';
import * as React from 'react';
import { useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { API } from '@project/constants';
import { ItemsBody } from '@project/validation';

import { getItemQueryKey } from 'utils/getItemQueryKey';

import asyncStorage from 'utils/asyncStorage';
import useMemoUser from './useMemoUser';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useMultiItemFetcher(itemIds: number[]) {
  const memoUser = useMemoUser();
  const [itemsFromStorage, setItemsFromStorage] = React.useState<i.CachedItemDataClassic[]>([]);
  const [storageFetched, setStorageFetched] = React.useState(false);

  const queryClient = useQueryClient();

  const query = useQuery(
    ['items', itemIds.map((id) => getItemQueryKey(id, memoUser))],
    async () => {
      const body: ItemsBody = {
        items: itemIds.map((id) => ({
          server_name: memoUser.server,
          faction: memoUser.faction as i.Factions,
          id: id,
          amount: 1,
        })),
      };

      const storedItems: i.CachedItemDataClassic[] = [];
      for await (const id of itemIds) {
        const itemFromStorage = await asyncStorage.getItem(getItemQueryKey(id, memoUser)) as i.CachedItemDataClassic;

        // If found, set it as the item
        if (itemFromStorage) {
          storedItems.push(itemFromStorage);
        }
      }

      if (storedItems.length > 0) {
        setItemsFromStorage(storedItems);
      }

      setStorageFetched(true);

      const { data } = await axios.post<i.MultiItemDataClassicResponse>(
        `${API.ItemsUrl}`,
        body,
        {
          params: {
            fields: 'itemId,uniqueName,stats',
          },
        },
      );

      return data;
    },
    {
      enabled: !!memoUser.server && !!memoUser.faction && !!memoUser.region && !!memoUser.version,
      onSuccess: async (data) => {
        for await (const item of data) {
          const cacheData: i.CachedItemDataClassic = {
            ...item,
            __version: 'classic',
            updatedAt: dayjs().toISOString(),
          };

          // Store in browser cache
          await asyncStorage.addItem(getItemQueryKey(item.itemId, memoUser)[1], cacheData);

          // Store in react-query cache
          queryClient.setQueryData(getItemQueryKey(item.itemId, memoUser), item);
        }
      },
    },
  );

  return {
    ...query,
    itemsFromStorage,
    storageFetched,
  };
}
