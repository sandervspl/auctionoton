import * as i from 'types';

import asyncStorage from 'utils/asyncStorage';


export type StorageStore = i.BrowserStorage & {
  actions: {
    init: () => Promise<void>;
    save: typeof asyncStorage.set;
    getItem: (name: string) => i.CachedItemData | undefined;
  };
};

export type StorageState = i.BrowserStorage;
