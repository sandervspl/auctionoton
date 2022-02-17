import * as i from 'types';
import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { ItemBody } from '@project/validation';
import { API } from '@project/constants';

import asyncStorage from 'utils/asyncStorage';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import validateCache from 'utils/validateCache';

import useMemoUser from './useMemoUser';


function useItemFetcher(itemId: number): UseItemFetcher {
  const memoUser = useMemoUser();
  const [error, setError] = React.useState('');
  const [warning, setWarning] = React.useState('');
  const [item, setItem] = React.useState<i.MaybeAnyItem>();
  const isClassicWowhead = useIsClassicWowhead();

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ['item', {
      itemId,
      server: memoUser.server,
      faction: memoUser.faction,
      version: memoUser.version,
    }] as i.ItemQueryKey,
    fetchItem,
    {
      refetchOnWindowFocus: false, // Generally just annoying, especially when fetch is failing
      retry: false, // Let user retry on demand with button
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
    if (isClassicWowhead) {
      if (!memoUser.server || !memoUser.faction) {
        return;
      }

      const body: ItemBody = {
        server_name: memoUser.server,
        faction: memoUser.faction as i.Factions,
        amount: 1,
      };

      try {
        const { data } = await axios.post<i.ItemDataClassicResponse>(`${API.ItemsUrl}/${itemId}`, body, {
          params: {
            fields: 'amount,uniqueName,stats',
          },
        });

        const localData: i.CachedItemDataClassic = {
          ...data,
          __version: 'classic',
          updatedAt: dayjs().toISOString(),
        };

        return localData;
      } catch (err) {
        console.error(err);
      }
    }

    /** @TODO */
    if (!isClassicWowhead) {
      return;
    }

    setError('Something went wrong fetching this item. Please try again.');
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
  item: i.MaybeAnyItem;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: string;
  warning: string;
  refetch: i.ItemRefetchFn;
}

export default useItemFetcher;
