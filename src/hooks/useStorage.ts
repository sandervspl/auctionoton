import * as i from 'types';
import React from 'react';
import { useRecoilState } from 'recoil';

import { storageAtom } from 'atoms';
import asyncStorage from 'utils/asyncStorage';
import api from 'utils/api';
import validateCache from 'utils/validateCache';


// eslint-disable-next-line
function useStorage() {
  const [storage, setStorage] = useRecoilState(storageAtom);

  React.useEffect(() => {
    /**
     * Initial load of user data from browser storage
     * Done here because of a bug
     * https://github.com/facebookexperimental/Recoil/issues/12
     */
    asyncStorage.get('user').then((user) => {
      if (!user) {
        return;
      }

      setStorage((curStorage) => ({
        ...curStorage,
        user,
      }));
    });


    // When browser storage changes we update the storage atom
    addon.storage.onChanged.addListener((changes) => {
      const storageChanges = changes as Record<i.StorageKeys, chrome.storage.StorageChange>;

      setStorage((curStorage) => {
        const modStorage = { ...curStorage };

        let key: i.StorageKeys;
        for (key in storageChanges) {
          modStorage[key] = {
            ...modStorage[key],
            ...storageChanges[key].newValue,
          };
        }

        return modStorage;
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

      if (cachedItem && validateCache(cachedItem)) {
        return resolve(cachedItem);
      }

      const item = await api.getItem(itemName);

      if (item) {
        return resolve(item);
      }
    });
  }

  return [storage, {
    get,
    getItem,
    saveToStorage: asyncStorage.set,
  }] as const;
}

export default useStorage;
