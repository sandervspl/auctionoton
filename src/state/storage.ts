import * as i from 'types';
import create, { SetState } from 'zustand';
import produce from 'immer';

import asyncStorage from 'utils/asyncStorage';


function store(set: SetState<i.Storage>) {
  return {
    user: {
      server: {},
    } as i.UserData,
    items: {} as i.ItemsData,

    init: async (): Promise<void> => {
      const browserStorage = await asyncStorage.getAll();
      set(browserStorage);
    },

    set: (fn: (state: i.Storage) => void) => set(produce(fn)),
  } as const;
}

export const [useStorageState, storageStoreApi] = create(store);
