import * as i from 'types';
import React from 'react';
import produce from 'immer';

import api from 'utils/api';
import { useStore } from 'state/store';
import useItemMgr from 'hooks/useItemMgr';


function useGetItem(itemId: number, amount = 1): UseGetItem {
  const storage = useStore((store) => store.storage);
  const [mutableItem, setMutableItem] = React.useState<i.AnyCachedItem>();
  const itemMgr = useItemMgr(itemId);

  function setItem(newItem?: i.AnyCachedItem) {
    setMutableItem(newItem);
    setItemValuesForAmount();
  }

  function setItemValuesForAmount() {
    if (!mutableItem) {
      setMutableItem(itemMgr.item);
    }

    setMutableItem((modItem) => produce(modItem, (draftState) => {
      if (!draftState || !itemMgr.item) {
        return draftState;
      }

      type Prices = {
        [k: string]: i.ValueObject;
      }

      const prices: Prices = (() => {
        let obj: Prices = {};

        if (itemMgr.item.__version === 'classic') {
          obj = {
            historicalValue: { ...itemMgr.item.historicalValue },
            marketValue: { ...itemMgr.item.marketValue },
            minimumBuyout: { ...itemMgr.item.minimumBuyout },
          };
        }

        if (itemMgr.item.__version === 'retail') {
          obj = {
            buyoutPrice: { ...itemMgr.item.buyoutPrice },
            unitPrice: { ...itemMgr.item.unitPrice },
          };
        }

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

  // Set new item values after fetch
  React.useEffect(() => {
    setItem(itemMgr.item);
  }, [itemMgr.item]);

  // Get item data
  React.useEffect(() => {
    itemMgr.refetch();

    return function cleanup() {
      api.cancelRequest();
    };
  }, [storage.user, itemId]);

  React.useEffect(setItemValuesForAmount, [amount]);

  return {
    loading: itemMgr.isLoading || itemMgr.isFetching,
    warning: itemMgr.warning,
    error: itemMgr.error,
    item: itemMgr.item,
    mutableItem,
    getItem: itemMgr.refetch,
  };
}


interface UseGetItem {
  loading: boolean;
  getItem: i.ItemRefetchFn;
  warning?: string;
  error?: string;
  item?: i.AnyCachedItem;
  mutableItem?: i.AnyCachedItem;
}

export default useGetItem;
