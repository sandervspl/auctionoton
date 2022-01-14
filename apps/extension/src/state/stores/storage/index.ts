import * as i from 'types';

import asyncStorage from 'utils/asyncStorage';


const initialState: i.StorageState = {
  user: { server: {} } as i.UserData,
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
      if ('user' in get().storage && Object.keys(get().storage.user?.server || {}).length > 0) {
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
  };
}

export default storageStore;
