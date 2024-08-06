import * as i from 'types';
import { skipToken, useQueries } from '@tanstack/react-query';

import { fetchItemFromAPI } from '@/queries/item';

import useUser from './useUser';
import { useWowhead } from './useWowhead';
import { getItemFromStorage } from '@/utils/storage';

export function useItemsFetcher(itemIds: number[], auctionHouseId: number) {
  const user = useUser();
  const { version } = useWowhead();

  return useQueries({
    queries: itemIds.map((itemId) => ({
      enabled: !!auctionHouseId,
      queryKey: ['item', auctionHouseId, itemId],
      retry: false,
      placeholderData: {
        itemId,
      } as i.CachedItemDataClassic,
      queryFn: async () => {
        if (!user.realm || !user.faction) {
          return;
        }

        // Check browser storage if item is stored
        const cachedItem = getItemFromStorage(user.realm!.auctionHouseId, itemId);
        if (cachedItem) {
          return cachedItem;
        }

        const fetchedItem = await fetchItemFromAPI(itemId, user.realm.auctionHouseId, version);

        if (fetchedItem === 'NOT_FOUND' || fetchedItem === undefined) {
          return {
            name: 'Not found',
            itemId,
          } as i.CachedItemDataClassic;
        }
        return fetchedItem;
      },
    })),
  });
}
