import * as i from 'types';

import asyncStorage from 'utils/asyncStorage';
import validateCache from 'utils/validateCache';
import api from 'utils/api';
import sanitizeItemName from 'utils/sanitizeItemName';


function storageState(set: i.Set, get: i.Get): i.StorageState {
  return {
    user: { server: {} } as i.UserData,
    items: {} as i.ItemsData,

    actions: {
      init: async (): Promise<void> => {
        // Check if it was already initialized
        if (get().storage.user.faction) {
          return;
        }

        const browserStorage = await asyncStorage.getAll();
        get().set((state) => {
          for (const key in browserStorage) {
            // @ts-ignore
            state.storage[key] = browserStorage[key];
          }
        });
      },

      /** For long term caching */
      save: asyncStorage.set,

      getItem: async (name: string): Promise<i.CachedItemData | undefined> => {
        return new Promise(async (resolve) => {
          const { user, items } = get().storage;
          const itemName = sanitizeItemName(name);

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
    },
  };
}

export default storageState;
