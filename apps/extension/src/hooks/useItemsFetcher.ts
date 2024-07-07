import * as i from 'types';
import { useQueries } from '@tanstack/react-query';

import asyncStorage from 'utils/asyncStorage';
import { fetchItemFromAPI } from 'src/queries/item';

import useUser from './useUser';
import { useWowhead } from './useWowhead';
import { useAuctionHouse } from './useAuctionHouse';

export function useItemsFetcher(itemIds: number[]) {
  const user = useUser();
  const { version } = useWowhead();
  const auctionHouseId = useAuctionHouse();

  return useQueries({
    queries: itemIds.map((itemId) => ({
      enabled: !!user.realm,
      queryKey: ['item', auctionHouseId, itemId],
      placeholderData: {
        itemId,
      } as i.CachedItemDataClassic,
      queryFn: async () => {
        if (!user.realm || !user.faction) {
          return;
        }

        // Check browser storage if item is stored
        const cachedItem = await asyncStorage.getItem([user.realm!.auctionHouseId, itemId]);
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
