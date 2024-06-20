import * as i from 'types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import asyncStorage from 'utils/asyncStorage';
import { fetchItemFromAPI } from 'src/queries/item';
import useUser from './useUser';
import { useWowhead } from './useWowhead';

export function useItemsFetcher(id: string | number | undefined, itemIds: number[]) {
  const queryClient = useQueryClient();
  const user = useUser();
  const { version } = useWowhead();

  return useQuery({
    queryKey: ['items', id],
    enabled: !!id && !!user.realm,
    queryFn: async () => {
      // Check browser storage if item is stored
      const cachedItems = await Promise.all(
        itemIds.map((itemId) => {
          return asyncStorage.getItem([user.realm!.auctionHouseId, itemId]);
        }),
      );

      const itemsIdsToFetch = cachedItems
        .map((item, index) => {
          if (item) {
            return null;
          }

          return itemIds[index];
        })
        .filter(Boolean) as number[];

      const result = await Promise.all(
        itemsIdsToFetch.map((itemId) => {
          if (!user.realm || !user.faction) {
            return;
          }

          return fetchItemFromAPI(itemId, user.realm.auctionHouseId, version);
        }),
      );

      const allItems = [...cachedItems, ...result];

      for (const item of allItems) {
        if (!item || !user.realm || typeof item === 'string') {
          continue;
        }

        const itemQueryKey: i.ItemQueryKey = [user.realm.auctionHouseId, item.itemId];
        queryClient.setQueryData<i.CachedItemDataClassic>(['item', ...itemQueryKey], item);
      }

      return allItems.filter(
        (item): item is i.CachedItemDataClassic =>
          !!item && typeof item !== 'string' && 'stats' in item,
      );
    },
  });
}
