import * as i from 'types';
import { useQuery } from 'react-query';
import asyncStorage from 'utils/asyncStorage';
import { fetchItemFromAPI } from 'src/queries/item';
import useUser from './useUser';

export function useItemsFetcher(id: string | number | undefined, itemIds: number[]) {
  const user = useUser();

  return useQuery({
    queryKey: ['items', id],
    enabled: !!id && !!user.realm,
    queryFn: async () => {
      // Check browser storage if item is stored
      const cachedItems = await Promise.all(
        itemIds.map((itemId) => {
          const key = [user.realm!.auctionHouseId, itemId];
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

          return fetchItemFromAPI(itemId, user.realm.auctionHouseId);
        }),
      );

      return [...cachedItems, ...result].filter((item): item is i.CachedItemDataClassic => !!item);
    },
  });
}
