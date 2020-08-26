import * as i from 'types';
import create from 'zustand';
import produce from 'immer';

import generateState from './generateState';
import storageState from './storage';
import uiState from './ui';


export function store(set: i.Set, get: i.Get): i.ModularState {
  return {
    /** For short term caching */
    set: (fn) => set(produce(fn)), // eslint-disable-line @typescript-eslint/explicit-module-boundary-types

    modules: {
      storage: storageState,
      ui: uiState,
    },
  };
}

// When browser storage changes we update the storage state
addon.storage.onChanged.addListener((changes) => {
  const storageChanges = changes as Record<i.StorageKeys, chrome.storage.StorageChange>;

  useStateApi.getState().set((curStore) => {
    let key: i.StorageKeys;
    for (key in storageChanges) {
      curStore.storage[key] = storageChanges[key].newValue;
    }
  });
});

export const [useState, useStateApi] = create(generateState);
