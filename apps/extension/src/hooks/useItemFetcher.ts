import * as i from 'types';
import React from 'react';
import { useQuery } from 'react-query';

import { getItemQueryKey } from 'utils/getItemQueryKey';

import { useFetchItem } from 'hooks/useFetchItem';
import useMemoUser from './useMemoUser';


function useItemFetcher(itemId?: number): UseItemFetcher {
  const memoUser = useMemoUser();
  const [warning, setWarning] = React.useState('');
  // const [item, setItem] = React.useState<i.MaybeAnyItem>();
  const { data, error, isLoading, isFetching, isError, refetch } = useFetchItem(getItemQueryKey(itemId, memoUser), memoUser);

  // const { data, isLoading, isFetching, isError, refetch } = useQuery(
  //   getItemQueryKey(itemId, memoUser),
  //   fetcher,
  //   {
  //     refetchOnWindowFocus: false, // Generally just annoying, especially when fetch is failing
  //     retry: false, // Let user retry on demand with button
  //     enabled: itemId != null,
  //   },
  // );

  // React.useEffect(() => {
  //   setItem(data);
  // }, [data]);

  // async function fetcher() {
  //   setError('');
  //   setWarning('');

  //   try {
  //     const data = await fetchItem();
  //     return data;
  //   } catch (err) {
  //     setError((err as Error).message);
  //   }
  // }

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
