import * as i from 'types';

import asyncStorage from 'utils/asyncStorage';
import validateCache from 'utils/validateCache';
import api from 'utils/api';
import sanitizeItemName from 'utils/sanitizeItemName';


const initialState: i.StorageState = {
  user: { server: {} } as i.UserData,
  items: {} as i.ItemsData,
};

function storageStore(set: i.Set, get: i.Get): i.StorageStore {
  return {
    ...initialState,
    actions: actions(set, get),
  };
}


function actions(set: i.Set, get: i.Get) {
  return {
    // Initialize store with data from local browser storage
    init: async (): Promise<void> => {
      // Check if it was already initialized
      if (get().storage.user.faction) {
        return;
      }

      // Get all data from local browser storage
      const browserStorage = await asyncStorage.getAll();

      // Save it to state for fast access
      set((store) => {
        for (const key in browserStorage) {
          // @ts-ignore
          store.storage[key] = browserStorage[key];
        }
      });
    },

    /** For long term caching */
    save: asyncStorage.set,

    // Get single item from state, storage or fetch from API
    getItem: async (name: string): Promise<i.CachedItemData | undefined> => {
      return new Promise(async (resolve) => {
        const { user, items } = get().storage;
        const itemName = sanitizeItemName(name);

        // Check if item is stored in state
        const cachedItem = items[user.server.slug]?.[user.faction]?.[itemName];

        if (validateCache(cachedItem)) {
          return resolve(cachedItem);
        }

        // If not, check for browser storage, or fetch from API
        const item = await api.getItem(itemName);

        if (item) {
          return resolve(item);
        }
      });
    },
  };
}

export default storageStore;
