import * as i from 'types';
import create from 'zustand';
import produce from 'immer';
import { assert, is } from 'tsafe';

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

  useStore.getState().set((draftState) => {
    for (const key in storageChanges) {
      assert(is<keyof i.StorageState>(key));
      draftState.storage[key] = storageChanges[key].newValue;
    }
  });
});

export const useStore = create(generateStore);
