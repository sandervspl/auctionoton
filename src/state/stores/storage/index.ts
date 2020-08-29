import * as i from 'types';

import asyncStorage from 'utils/asyncStorage';
import validateCache from 'utils/validateCache';
import api from 'utils/api';
import sanitizeItemName from 'utils/sanitizeItemName';


const initialState: i.StorageState = {
  user: { server: {} } as i.UserData,
  items: {} as i.ItemsData,
  showTip: {
    shiftKey: true,
  },
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
    getItem: (name: string, cb: (latestItem: i.ItemData | undefined) => void): i.CachedItemData | undefined => {
      const { user, items } = get().storage;
      const itemName = sanitizeItemName(name);

      // Check if item is stored in state and data is not too old
      const cachedItem = items[user.server.slug]?.[user.faction]?.[itemName];

      if (validateCache(cachedItem)) {
        cb(cachedItem);

        return cachedItem;
      }

      // If not, check for browser storage, or fetch from API
      api.getItem(itemName).then(cb);

      // Return cached item in the mean time
      if (cachedItem) {
        return cachedItem;
      }
    },
  };
}

export default storageStore;
