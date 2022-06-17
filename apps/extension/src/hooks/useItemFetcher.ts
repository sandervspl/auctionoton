import * as i from 'types';
import React from 'react';

import { getItemQueryKey } from 'utils/getItemQueryKey';

import { useFetchItem } from 'hooks/useFetchItem';
import useMemoUser from './useMemoUser';


function useItemFetcher(itemId?: number): UseItemFetcher {
  const memoUser = useMemoUser();
  const [warning, setWarning] = React.useState('');
  const { data, error, isLoading, isFetching, isError, refetch } = useFetchItem(getItemQueryKey(itemId, memoUser), memoUser);

  return {
    item: data,
    isLoading,
    isFetching,
    isError,
    error: error as string,
    warning,
    refetch,
  };
}

interface UseItemFetcher {
  item: i.MaybeAnyItem;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: string;
  warning: string;
  refetch: i.ItemRefetchFn;
}

export default useItemFetcher;
