import * as i from 'types';
import * as React from 'react';
import { useQuery } from 'react-query';

import { fetchItem } from 'utils/fetchItem';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useFetchItem(
  queryKey: i.ItemQueryKey,
  memoUser: i.MemoUser,
) {
  const [itemFromStorage, setItemFromStorage] = React.useState<i.MaybeAnyItem>();

  const query = useQuery(
    queryKey,
    () => fetchItem(queryKey, memoUser, setItemFromStorage),
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
  };
}
