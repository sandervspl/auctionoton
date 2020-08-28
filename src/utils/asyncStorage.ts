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

  async set <T extends i.StorageKeys>(data: Record<T, i.BrowserStorage[T]>): Promise<void> {
    return new Promise((resolve) => {
      addon.storage.local.set(data, resolve);
    });
  }

  async addItem(name: string, data: i.CachedItemData): Promise<void> {
    const user = useStore.getState().storage.user;
    const storageItems = await this.get('items') || {};

    const items = produce(storageItems, (draftState) => {
      _set(draftState, `${user.server.slug}.${user.faction}.${name}`, data);
    });

    await this.set({ items });
  }

  async getItem(itemName: string): Promise<i.CachedItemData | undefined> {
    const user = useStore.getState().storage.user;
    const items = await this.get('items');

    return items?.[user.server.slug]?.[user.faction]?.[itemName];
  }
}

const asyncStorage = new AsyncStorage();

export default asyncStorage;
