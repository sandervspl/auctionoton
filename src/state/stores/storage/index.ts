import * as i from 'types';

import asyncStorage from 'utils/asyncStorage';
import validateCache from 'utils/validateCache';


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

    // Get single item from state
    getItem: (itemName: string): i.CachedItemData | undefined => {
      const { user, items } = get().storage;

      // Look up item in browser storage
      const cachedItem = items[user.server.slug]?.[user.faction]?.[itemName];

      // Check if data is valid and within the time limit
      if (validateCache(cachedItem)) {
        return cachedItem;
      }
    },
  };
}

export default storageStore;
