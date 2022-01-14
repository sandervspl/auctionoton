import * as i from 'types';
import React from 'react';
import { useQuery } from 'react-query';

import { useStore } from 'state/store';
import time from 'utils/time';
import asyncStorage from 'utils/asyncStorage';
import api from 'utils/api';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import validateCache from 'utils/validateCache';


function useItemMgr(itemId: number): UseItemMgr {
  const { user } = useStore((store) => store.storage);
  const [error, setError] = React.useState('');
  const [warning, setWarning] = React.useState('');
  const [item, setItem] = React.useState<i.MaybeAnyItem>();
  const isClassicWowhead = useIsClassicWowhead();

  const ITEM_IDENTIFIER = ['item', {
    itemId,
    server: user.server[user.version]?.name,
    faction: isClassicWowhead && user.faction[user.server.classic!.slug],
    version: user.version,
  }] as i.ItemQueryKey;
  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ITEM_IDENTIFIER,
    fetchItem,
    {
      refetchOnWindowFocus: false, // Generally just annoying, especially when fetch is failing
      retry: false, // Let user retry on demand with button
      staleTime: __DEV__ ? time.seconds(5) : time.hours(1), // Doesn't seem to do anything?
    },
  );

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
    const version: i.Versions = isClassicWowhead ? 'classic' : 'retail';
    const itemFromFetch = await api.getItem(version, itemId, setWarning, setError);

    if (itemFromFetch) {
      asyncStorage.addItem(queryKey, itemFromFetch);
    } else {
      if (isClassicWowhead) {
        setError('Something went wrong fetching this item. This might be because Auction House service is down.');
      } else {
        setError('Something went wrong fetching this item. Please try again.');
      }
    }

    return itemFromFetch;
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

interface UseItemMgr {
  item: i.MaybeAnyItem;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: string;
  warning: string;
  refetch: i.ItemRefetchFn;
}

export default useItemMgr;
