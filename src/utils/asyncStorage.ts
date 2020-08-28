import * as i from 'types';
import produce from 'immer';
import _set from 'lodash/set';

import { useStore } from 'state/store';


class AsyncStorage {
  async getAll(): Promise<i.BrowserStorage> {
    return new Promise((resolve) => {
      addon.storage.local.get(null, (data) => {
        const browserStorage = data as i.BrowserStorage;

        if ('user' in browserStorage) {
          return resolve(browserStorage);
        }

        return resolve({
          user: { server: {} } as i.UserData,
          items: {},
          shownTip: {
            shiftKey: true,
          },
        });
      });
    });
  }

  async get <T extends i.StorageKeys>(key: T): Promise<i.BrowserStorage[T] | undefined> {
    return new Promise((resolve) => {
      addon.storage.local.get(key, (items) => {
        return resolve(items[key]);
      });
    });
  }

  async set <T extends i.StorageKeys>(key: T, update: (draft: i.BrowserStorage[T]) => void): Promise<void> {
    const cur = await this.get(key);
    const next = produce(cur || {}, update);

    return new Promise((resolve) => {
      addon.storage.local.set({ [key]: next }, resolve);
    });
  }

  async addItem(name: string, data: i.CachedItemData): Promise<void> {
    const user = useStore.getState().storage.user;

    await this.set('items', (draftState) => {
      _set(draftState, `${user.server.slug}.${user.faction}.${name}`, data);
    });
  }

  async getItem(itemName: string): Promise<i.CachedItemData | undefined> {
    const user = useStore.getState().storage.user;
    const items = await this.get('items');

    return items?.[user.server.slug]?.[user.faction]?.[itemName];
  }
}

const asyncStorage = new AsyncStorage();

export default asyncStorage;
