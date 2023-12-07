import * as i from 'types';
import React from 'react';
import { useQuery, UseQueryOptions } from 'react-query';

import asyncStorage from 'utils/asyncStorage';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import validateCache from 'utils/validateCache';

import { fetchItemFromAPI } from 'src/queries/item';
import { createQueryKey } from 'utils/queryKey';
import useUser from './useUser';

type Options = UseQueryOptions<
  i.CachedItemDataClassic | undefined,
  unknown,
  i.CachedItemDataClassic,
  i.ItemQueryKey
>;

function useItemFetcher(itemId: number, options?: Options): UseItemFetcher {
  const user = useUser();
  const [error, setError] = React.useState('');
  const [warning, setWarning] = React.useState('');
  const [item, setItem] = React.useState<i.CachedItemDataClassic>();
  const { isClassicWowhead, isEra } = useIsClassicWowhead();

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: createQueryKey(itemId, user),
    queryFn: fetchItem,
    refetchOnWindowFocus: true,
    retry: false, // Let user retry on demand with button
    ...options,
  });

  React.useEffect(() => {
    setItem(data);
  }, [data]);

  async function fetchItem(queryKey: i.ItemQueryKeyCtx) {
    setError('');
    setWarning('');

    // Check browser storage if item is stored
    const itemFromStorage = await asyncStorage.getItem(queryKey);

    // If found, set it as the item
    if (itemFromStorage) {
      setItem(itemFromStorage);

      if (validateCache(itemFromStorage)) {
        return itemFromStorage;
      }
    }

    // If item from storage is stale, fetch item
    if (isClassicWowhead) {
      if (!user.realm || !user.faction) {
        return;
      }

      const result = await fetchItemFromAPI(
        itemId,
        user.realm,
        user.faction,
        user.region,
        isEra,
        queryKey,
      );

      if (result) {
        return result;
      }
    }

    setError('Something went wrong fetching this item. Please try again.');
    throw new Error('Something went wrong fetching this item. Please try again.');
  }

  return {
    item,
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
