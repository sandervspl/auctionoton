import { useQuery } from '@tanstack/react-query';
import { itemQueryOptions } from '@/queries/item';
import { useItemMarket } from './useItemMarket';

function useItemFetcher(
  itemId: number,
  auctionHouseId: number,
  options?: { enabled?: boolean; retryOnMount?: boolean },
) {
  const market = useItemMarket(auctionHouseId);
  const query = useQuery({ ...itemQueryOptions(itemId, market), ...options });
  return {
    item: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error?.message ?? '',
    warning: '',
    refetch: query.refetch,
  };
}

export default useItemFetcher;
