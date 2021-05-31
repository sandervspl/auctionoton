import * as i from 'types';
import produce from 'immer';
import _set from 'lodash/set';

import { useStore } from 'state/store';

// addon.storage.local.clear();

class AsyncStorage {
  readonly initUserState: i.UserData = {
    region: 'us',
    server: {
      name: 'Amnennar',
      slug: 'amnennar',
    },
    faction: 'Alliance',
  };

  async getAll(): Promise<i.BrowserStorage> {
    return new Promise((resolve) => {
      addon.storage.local.get(null, (data) => {
        const browserStorage = data as i.BrowserStorage;

        if ('user' in browserStorage) {
          return resolve(browserStorage);
        }

        return resolve({
          user: this.initUserState,
          items: {},
          showTip: {
            shiftKey: true,
          },
        });
      });
    });
  }

  get = async <T extends i.StorageKeys>(key: T): Promise<i.BrowserStorage[T] | undefined> => {
    return new Promise((resolve) => {
      addon.storage.local.get(key, (items) => {
        return resolve(items[key]);
      });
    });
  }

  set = async <T extends i.StorageKeys>(key: T, update: (draft: i.BrowserStorage[T]) => void): Promise<void> => {
    const cur = await this.get(key);
    const next = produce(cur || {}, update);

    return new Promise((resolve) => {
      addon.storage.local.set({ [key]: next }, resolve);
    });
  }

  clear = async <T extends i.StorageKeys>(key: T): Promise<void> => {
    return new Promise((resolve) => {
      addon.storage.local.set({ [key]: {} }, resolve);
    });
  }

  addItem = async (name: string, data: i.CachedItemData): Promise<void> => {
    const user = useStore.getState().storage.user;

    await this.set('items', (draftState) => {
      _set(draftState, `${user.server.slug}.${user.faction}.${name}`, data);
    });
  }

  getItem = async (itemName: string, cb: (item: i.CachedItemData | undefined) => void): Promise<void> => {
    const user = useStore.getState().storage.user;
    const items = await this.get('items');
    const item = items?.[user.server.slug]?.[user.faction]?.[itemName];

    cb(item);
  }
}

const asyncStorage = new AsyncStorage();

export default asyncStorage;
