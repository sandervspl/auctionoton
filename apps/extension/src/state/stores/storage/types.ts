import * as i from 'types';

import asyncStorage from 'utils/asyncStorage';


type StateStores = Omit<i.BrowserStorage, 'items'>;

export type StorageStore = StateStores & {
  actions: {
    init: () => Promise<void>;
    save: typeof asyncStorage.set;
  };
};

export type StorageState = StateStores;
