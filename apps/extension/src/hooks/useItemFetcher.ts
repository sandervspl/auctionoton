import * as i from 'types';
import React from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

import asyncStorage from 'utils/asyncStorage';
import validateCache from 'utils/validateCache';

import { fetchItemFromAPI } from 'src/queries/item';
import useUser from './useUser';

type Options = Omit<
  UseQueryOptions<i.CachedItemDataClassic | undefined, unknown, i.CachedItemDataClassic>,
  'queryKey' | 'queryFn'
>;

function useItemFetcher(itemId: number, options?: Options): UseItemFetcher {
  const user = useUser();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState('');
  const [warning, setWarning] = React.useState('');
  const queryKey: i.ItemQueryKey = [user.realm?.auctionHouseId || 0, itemId];
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['item', ...queryKey],
    queryFn: fetchItem,
    refetchOnWindowFocus: true,
    retry: false, // Let user retry on demand with button
    enabled: !!user.realm?.auctionHouseId && !!itemId,
    ...options,
  });

  async function fetchItem() {
    setError('');
    setWarning('');

    // Check browser storage if item is stored
    const itemFromStorage = await asyncStorage.getItem(queryKey);

    // If found, set it as the item
    if (itemFromStorage && user.realm?.auctionHouseId) {
      queryClient.setQueryData(['item', ...queryKey], itemFromStorage);

      if (validateCache(itemFromStorage)) {
        return itemFromStorage;
      }
    }

    // If item from storage is stale, fetch item
    if (!user.realm || !user.faction) {
      return;
    }

    const result = await fetchItemFromAPI(itemId, user.realm.auctionHouseId);

    if (result) {
      return result;
    }

    setError('Something went wrong fetching this item. Please try again.');
    throw new Error('Something went wrong fetching this item. Please try again.');
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
