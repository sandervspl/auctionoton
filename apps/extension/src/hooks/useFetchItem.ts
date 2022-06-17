import * as i from 'types';
import * as React from 'react';
import { useQuery } from 'react-query';

import { fetchItem } from 'utils/fetchItem';
import { getItemQueryKey } from 'utils/getItemQueryKey';

import useMemoUser from './useMemoUser';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useFetchItem(itemId?: number) {
  const memoUser = useMemoUser();
  const [itemFromStorage, setItemFromStorage] = React.useState<i.MaybeAnyItem>();
  const [storageFetched, setStorageFetched] = React.useState(false);
  const queryKey = getItemQueryKey(itemId, memoUser);

  const query = useQuery(
    queryKey,
    () => fetchItem(queryKey, memoUser, (item) => {
      setStorageFetched(true);
      setItemFromStorage(item);
    }),
    {
      refetchOnWindowFocus: false, // Generally just annoying, especially when fetch is failing
      retry: false, // Let user retry on demand with button
      enabled: queryKey[1].itemId != null,
    },
  );

  return {
    ...query,
    // query.data will be undefined first/longer, return itemFromStorage first
    data: query.data || itemFromStorage,
    storageFetched,
  };
}
