import * as i from 'types';
import create, { SetState, GetState } from 'zustand';
import produce from 'immer';

import asyncStorage from 'utils/asyncStorage';
import validateCache from 'utils/validateCache';
import api from 'utils/api';


function store(set: SetState<i.Storage>, get: GetState<i.Storage>) {
  return {
    user: {
      server: {},
    } as i.UserData,
    items: {} as i.ItemsData,

    init: async (): Promise<void> => {
      // Check if it was already initialized
      if (get().user.faction) {
        return;
      }

      const browserStorage = await asyncStorage.getAll();
      set(browserStorage);
    },

    /** For short term caching */
    set: (fn: (state: i.Storage) => void) => set(produce(fn)),
    /** For long term caching */
    save: asyncStorage.set,

    getItem: async (itemName: string): Promise<i.CachedItemData | undefined> => {
      return new Promise(async (resolve) => {
        const { user, items } = get();
        const cachedItem = items[user.server.slug]?.[user.faction]?.[itemName];

        if (validateCache(cachedItem)) {
          return resolve(cachedItem);
        }

        const item = await api.getItem(itemName);

        if (item) {
          return resolve(item);
        }
      });
    },
  } as const;
}

// When browser storage changes we update the storage state
addon.storage.onChanged.addListener((changes) => {
  const storageChanges = changes as Record<i.StorageKeys, chrome.storage.StorageChange>;

  useStorageApi.getState().set((curStorage) => {
    let key: i.StorageKeys;
    for (key in storageChanges) {
      curStorage[key] = storageChanges[key].newValue;
    }
  });
});

export const [useStorage, useStorageApi] = create(store);
