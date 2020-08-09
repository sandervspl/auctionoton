import * as i from 'types';
import React from 'react';

import { useStorageState } from 'state/storage';
import asyncStorage from 'utils/asyncStorage';
import api from 'utils/api';
import validateCache from 'utils/validateCache';


// eslint-disable-next-line
function useStorage() {
  const storage = useStorageState();

  React.useEffect(() => {
    // When browser storage changes we update the storage state
    addon.storage.onChanged.addListener((changes) => {
      const storageChanges = changes as Record<i.StorageKeys, chrome.storage.StorageChange>;

      storage.set((curStorage) => {
        let key: i.StorageKeys;
        for (key in storageChanges) {
          curStorage[key] = storageChanges[key].newValue;
        }
      });
    });
  }, []);


  async function get<T extends i.StorageKeys>(key: T): Promise<i.Storage[T]> {
    return new Promise(async (resolve) => {
      if (key in storage) {
        return resolve(storage[key]);
      }

      const data = await asyncStorage.get(key);

      return resolve(data);
    });
  }

  async function getItem(itemName: string): Promise<i.CachedItemData | undefined> {
    return new Promise(async (resolve) => {
      const { user } = storage;
      const cachedItem = storage.items[user.server.slug]?.[user.faction]?.[itemName];

      if (validateCache(cachedItem)) {
        return resolve(cachedItem);
      }

      const item = await api.getItem(itemName);

      if (item) {
        return resolve(item);
      }
    });
  }

  return [{
    user: storage.user,
    items: storage.items,
  }, {
    get,
    getItem,
    saveToStorage: asyncStorage.set,
  }] as const;
}

export default useStorage;
