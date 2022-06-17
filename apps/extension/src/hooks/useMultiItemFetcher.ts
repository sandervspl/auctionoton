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
  const [itemsFromStorage, setItemsFromStorage] = React.useState<Map<number, i.MaybeAnyItem>>(new Map());

  const queryClient = useQueryClient();

  const query = useQuery(
    ['items', ...itemIds],
    async () => {
      const body: ItemsBody = {
        items: itemIds.map((id) => ({
          server_name: memoUser.server,
          faction: memoUser.faction as i.Factions,
          id: id,
          amount: 1,
        })),
      };

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
      enabled: !!memoUser.server && !!memoUser.faction,
      onSuccess: (data) => {
        for (const item of data) {
          const cacheData: i.CachedItemDataClassic = {
            ...item,
            __version: 'classic',
            updatedAt: dayjs().toISOString(),
          };

          // Store in browser cache
          asyncStorage.addItem(getItemQueryKey(item.itemId, memoUser)[1], cacheData);

          // Store in react-query cache
          queryClient.setQueryData(['item', getItemQueryKey(item.itemId, memoUser)], data);
        }
      },
    },
  );

  return {
    ...query,
    itemFromStorage,
  };
}
