import * as i from 'types';
import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { ItemBody } from '@project/validation';
import { API } from '@project/constants';

import { useStore } from 'state/store';
import time from 'utils/time';
import asyncStorage from 'utils/asyncStorage';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import validateCache from 'utils/validateCache';


function useItemFetcher(itemId: number): UseItemMgr {
  const { user } = useStore((store) => store.storage);
  const [error, setError] = React.useState('');
  const [warning, setWarning] = React.useState('');
  const [item, setItem] = React.useState<i.MaybeAnyItem>();
  const isClassicWowhead = useIsClassicWowhead();

  const memoUser = React.useMemo(() => {
    let server = '';
    let faction = '';

    if (user?.version === 'classic') {
      server = user.server?.classic?.slug ?? '';
    } else if (user?.version === 'retail') {
      server = user.server?.retail?.name ?? '';
    }

    faction = user?.faction?.[server.toLowerCase()]?.toLowerCase() || '';

    return {
      server,
      faction,
    };
  }, [
    user?.server?.classic?.name,
    user?.server?.retail?.name,
    user?.faction?.[user?.server?.classic?.slug.toLowerCase() || ''],
    user?.faction?.[user?.server?.retail?.name.toLowerCase() || ''],
  ]);

  const ITEM_IDENTIFIER = ['item', {
    itemId,
    server: memoUser.server,
    faction: memoUser.faction,
    version: user?.version,
  }] as i.ItemQueryKey;
  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ITEM_IDENTIFIER,
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
    const version: i.Versions = isClassicWowhead ? 'classic' : 'retail';

    if (version === 'classic') {
      if (!memoUser.server || !memoUser.faction) {
        return;
      }

      const body: ItemBody = {
        server_name: memoUser.server,
        faction: memoUser.faction as i.Factions,
        amount: 1,
      };

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
    }

    /** @TODO */
    if (version === 'retail') {
      return;
    }

    if (isClassicWowhead) {
      setError('Something went wrong fetching this item. This might be because Auction House service is down.');
    } else {
      setError('Something went wrong fetching this item. Please try again.');
    }
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

export default useItemFetcher;
