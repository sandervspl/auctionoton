import * as i from 'types';
import React from 'react';
import produce from 'immer';

import api from 'utils/api';
import { useStore } from 'state/store';
import itemMgr from 'src/ItemMgr';


function useGetItem(itemName: string, amount = 1): UseGetItem {
  const storage = useStore((store) => store.storage);
  const [loading, setLoading] = React.useState(false);
  const [warning, setWarning] = React.useState('');
  const [error, setError] = React.useState('');
  const [mutableItem, setMutableItem] = React.useState<i.CachedItemData>();
  const item = React.useRef<i.CachedItemData>();

  async function getItem() {
    setItem(undefined);
    setError('');
    setWarning('');
    setLoading(true);

    function onSuccess(item: i.CachedItemData | undefined) {
      if (item) {
        setItem(item);
      }

      setLoading(false);
    }

    function onError(err: string) {
      setLoading(false);
      setError(err);
    }

    const cacheItem = itemMgr.get(itemName, onSuccess, setWarning, onError);

    // Set item from cache
    setItem(cacheItem);
  }

  function setItem(newItem?: i.CachedItemData) {
    item.current = newItem;
    setMutableItem(newItem);
    setItemValuesForAmount();
  }

  function setItemValuesForAmount() {
    if (!mutableItem) {
      setMutableItem(item.current);
    }

    setMutableItem((modItem) => produce(modItem, (draftState) => {
      if (!draftState || !item.current) {
        return draftState;
      }

      const prices = {
        historicalValue: { ...item.current.historicalValue },
        marketValue: { ...item.current.marketValue },
        minimumBuyout: { ...item.current.minimumBuyout },
      };

      let type: keyof typeof prices;
      for (type in prices) {
        // Can be "Unavailable"
        if (typeof prices[type] === 'string') {
          continue;
        }

        let coin: keyof typeof prices[typeof type];
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

        draftState[type] = prices[type];
      }
    }));
  }

  // Get item data
  React.useEffect(() => {
    getItem();

    return function cleanup() {
      api.cancelRequest();
    };
  }, [storage.user, itemName]);

  React.useEffect(setItemValuesForAmount, [amount]);

  return {
    loading,
    warning,
    error,
    item: item.current,
    mutableItem,
    getItem,
  };
}


interface UseGetItem {
  loading: boolean;
  getItem: () => Promise<void>;
  warning?: string;
  error?: string;
  item?: i.CachedItemData;
  mutableItem?: i.CachedItemData;
}

export default useGetItem;
