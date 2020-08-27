import * as i from 'types';
import create from 'zustand';
import produce from 'immer';

import generateStore from './generateState';
import storageStore from './stores/storage';
import uiStore from './stores/ui';


export function store(set: i.ZustandSet, get: i.Get): i.GenStore {
  return {
    /** For short term caching */
    set: (fn) => set(produce(fn)), // eslint-disable-line @typescript-eslint/explicit-module-boundary-types

    // Stores
    storage: storageStore,
    ui: uiStore,
  };
}

// When browser storage changes we update the storage state
addon.storage.onChanged.addListener((changes) => {
  const storageChanges = changes as Record<i.StorageKeys, chrome.storage.StorageChange>;

  useStore.getState().set((store) => {
    let key: i.StorageKeys;
    for (key in storageChanges) {
      store.storage[key] = storageChanges[key].newValue;
    }
  });
});

export const useStore = create(generateStore);
