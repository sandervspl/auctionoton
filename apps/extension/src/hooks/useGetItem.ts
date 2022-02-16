import * as i from 'types';
import React from 'react';
import produce from 'immer';
import { useQuery } from 'react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { API } from '@project/constants';
import type { ItemBody } from '@project/validation';

// import api from 'utils/api';
import { useStore } from 'state/store';
import useItemFetcher from 'hooks/useItemFetcher';


function useGetItem(itemId: number, amount = 1): UseGetItem {
  const storage = useStore((store) => store.storage);
  const [mutableItem, setMutableItem] = React.useState<i.MaybeAnyItem>();
  const { error, isFetching, isLoading, item, refetch } = useItemFetcher(itemId);

  // const { data: item, isLoading, isFetching, error, refetch } = useQuery([
  //   itemId,
  //   memoUser.server,
  //   memoUser.faction,
  // ], async () => {
  //   if (!memoUser.server || !memoUser.faction) {
  //     return;
  //   }


  // });

  React.useEffect(() => {
    setMutableItem(item);
  }, [item]);

  function setItemValuesForAmount() {
    setMutableItem((modItem) => produce(modItem, (draftState) => {
      type Prices = {
        [k: string]: i.ValueObject;
      }

      const prices: Prices = (() => {
        const obj: Prices = {};

        if (item?.__version === 'classic') {
          const { historicalValue, marketValue, minimumBuyout } = item.stats.current;

          if (typeof historicalValue !== 'string') {
            obj.historicalValue = { ...historicalValue };
          }
          if (typeof marketValue !== 'string') {
            obj.marketValue = { ...marketValue };
          }
          if (typeof minimumBuyout !== 'string') {
            obj.minimumBuyout = { ...minimumBuyout };
          }
        }

        // if (itemMgr.item.__version === 'retail') {
        //   obj = {
        //     buyoutPrice: { ...itemMgr.item.buyoutPrice },
        //     unitPrice: { ...itemMgr.item.unitPrice },
        //   };
        // }

        return obj;
      })();

      for (const type in prices) {
        if (prices[type] == null) {
          continue;
        }

        // Can be "Unavailable"
        if (typeof prices[type] === 'string') {
          continue;
        }

        let coin: keyof i.ValueObject;
        for (coin in prices[type]) {
          prices[type][coin] *= amount;
        }

        // Overflow from copper to silver
        if (prices[type].copper >= 100) {
          prices[type].silver ||= 0;
          // Add all but the remainder from copper to silver
          prices[type].silver += (prices[type].copper - prices[type].copper % 100) / 100;
          // Keep the remainder in copper
          prices[type].copper %= 100;
        }

        // Overflow from silver to gold
        if (prices[type].silver >= 100) {
          prices[type].gold ||= 0;
          prices[type].gold += (prices[type].silver - prices[type].silver % 100) / 100;
          prices[type].silver %= 100;
        }

        // @ts-ignore Can't find a reasonable solution. It works.
        draftState[type] = prices[type];
      }
    }));
  }

  // Get item data
  // React.useEffect(() => {
  //   itemMgr.refetch();

  //   return function cleanup() {
  //     api.cancelRequest();
  //   };
  // }, [storage.user, itemId]);

  React.useEffect(setItemValuesForAmount, [amount]);

  return {
    loading: isLoading || isFetching,
    // warning: itemMgr.warning,
    error,
    item,
    mutableItem,
    getItem: refetch,
  };
}


interface UseGetItem {
  loading: boolean;
  getItem: i.ItemRefetchFn;
  warning?: string;
  error?: unknown;
  item?: i.AnyCachedItem;
  mutableItem?: i.AnyCachedItem;
}

export default useGetItem;
