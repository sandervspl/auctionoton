import * as i from 'types';
import { useQuery } from 'react-query';
import asyncStorage from 'utils/asyncStorage';
import { fetchItemFromAPI } from 'src/queries/item';
import { createQueryKey } from 'utils/queryKey';
import useUser from './useUser';
import useIsClassicWowhead from './useIsClassicWowhead';

export function useItemsFetcher(id: string | number | undefined, itemIds: number[]) {
  const { isEra } = useIsClassicWowhead();
  const memoUser = useUser();

  return useQuery({
    queryKey: ['items', id],
    enabled: !!id && !!memoUser.realm,
    queryFn: async () => {
      // Check browser storage if item is stored
      const cachedItems = await Promise.all(
        itemIds.map((itemId) => {
          const key = createQueryKey(itemId, memoUser);
          return asyncStorage.getItem({ meta: {}, queryKey: key });
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
          const key = {
            meta: {},
            queryKey: createQueryKey(itemId, memoUser),
          };
          return fetchItemFromAPI(itemId, memoUser.realm, memoUser.faction, isEra, key);
        }),
      );

      return [...cachedItems, ...result].filter((item): item is i.CachedItemDataClassic => !!item);
    },
  });
}
