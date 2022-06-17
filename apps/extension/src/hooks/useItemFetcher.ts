import React from 'react';

import { useFetchItem } from 'hooks/useFetchItem';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function useItemFetcher(itemId?: number) {
  const [warning, setWarning] = React.useState('');
  const {
    data, error, isLoading, isFetching, isError, refetch, storageFetched,
  } = useFetchItem(itemId);

  return {
    item: data,
    isLoading,
    isFetching,
    isError,
    error: error as string,
    warning,
    refetch,
    storageFetched,
  };
}

export default useItemFetcher;
