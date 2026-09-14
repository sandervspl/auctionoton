import { useQueries } from '@tanstack/react-query';
import { itemQueryOptions } from '@/queries/item';
import { useItemMarket } from './useItemMarket';

export function useItemsFetcher(itemIds: number[], auctionHouseId: number) {
  const market = useItemMarket(auctionHouseId);
  return useQueries({
    queries: [...new Set(itemIds)].map((itemId) => itemQueryOptions(itemId, market)),
  });
}
