import * as i from 'types';
import { useQueries } from '@tanstack/react-query';

import { fetchItemFromAPI } from '@/queries/item';

import { useWowhead } from './useWowhead';
import { getItemFromStorage } from '@/utils/storage';

export function useItemsFetcher(itemIds: number[], auctionHouseId: number) {
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
        // Check browser storage if item is stored
        const cachedItem = await getItemFromStorage(auctionHouseId, itemId);

        if (cachedItem) {
          return cachedItem;
        }

        const fetchedItem = await fetchItemFromAPI(itemId, auctionHouseId, version);

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
