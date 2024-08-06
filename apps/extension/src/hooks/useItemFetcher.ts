import * as i from 'types';
import React from 'react';
import { skipToken, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';

import { validateCache } from 'utils';
import { fetchItemFromAPI } from '@/queries/item';
import { getItemFromStorage } from '@/utils/storage';

import { useAuctionHouse } from './useAuctionHouse';
import { useWowhead } from './useWowhead';

type Options = Omit<
  UseQueryOptions<i.CachedItemDataClassic | undefined, unknown, i.CachedItemDataClassic>,
  'queryKey' | 'queryFn'
>;

function useItemFetcher(itemId: number, options?: Options): UseItemFetcher {
  const auctionHouseId = useAuctionHouse();
  const { version } = useWowhead();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState('');
  const [warning, setWarning] = React.useState('');
  const queryKey: i.ItemQueryKey = [auctionHouseId!, itemId];
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['item', ...queryKey],
    queryFn: !!auctionHouseId && !!itemId ? fetchItem : skipToken,
    refetchOnWindowFocus: true,
    retry: false, // Let user retry on demand with button
    ...options,
  });

  async function fetchItem() {
    if (auctionHouseId == null || auctionHouseId <= 0) {
      return;
    }

    setError('');
    setWarning('');

    // Check browser storage if item is stored
    const itemFromStorage = await getItemFromStorage(auctionHouseId, itemId);
    // If found, set it as the item
    if (itemFromStorage) {
      if (queryKey.every((v) => v != null)) {
        queryClient.setQueryData<i.CachedItemDataClassic>(['item', ...queryKey], itemFromStorage);
      }

      if (validateCache(itemFromStorage)) {
        return itemFromStorage;
      }
    }

    const result = await fetchItemFromAPI(itemId, auctionHouseId!, version);

    if (result == null) {
      setError('Something went wrong fetching this item. Please try again.');
      throw new Error('Something went wrong fetching this item. Please try again.');
    }

    if (result === 'NOT_FOUND') {
      setError('Item not found! This item might not be available on this realm.');
      throw new Error('Item not found. This item might not be available on this realm.');
    }

    return result;
  }

  return {
    item: data,
    isLoading,
    isFetching,
    isError,
    error,
    warning,
    refetch,
  };
}

interface UseItemFetcher {
  item?: i.CachedItemDataClassic;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: string;
  warning: string;
  refetch: i.ItemRefetchFn;
}

export default useItemFetcher;
