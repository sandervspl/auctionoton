import * as i from 'types';
import produce from 'immer';


class AsyncStorage {
  async getAll(): Promise<i.Storage> {
    return new Promise((resolve) => {
      addon.storage.local.get(null, (data) => {
        const _data = data as i.Storage;

        if ('user' in _data) {
          return resolve(_data);
        }

        return {
          user: { server: {} },
          items: {},
        };
      });
    });
  }

  async get <T extends i.StorageKeys>(key: T): Promise<i.Storage[T] | undefined> {
    return new Promise((resolve) => {
      addon.storage.local.get(key, (items) => {
        return resolve(items[key]);
      });
    });
  }

  async set <T extends i.StorageKeys>(data: Record<T, i.Storage[T]>): Promise<void> {
    return new Promise((resolve) => {
      addon.storage.local.set(data, resolve);
    });
  }

  async addItem(name: string, data: i.CachedItemData): Promise<void> {
    const user = await this.get('user') as i.UserData;
    const storageItems = await this.get('items') || {};

    const items = produce(storageItems, (draftState) => {
      draftState[user.server.slug][user.faction][name] = data;
    });

    await this.set({ items });
  }

  async getItem(itemName: string): Promise<i.CachedItemData | undefined> {
    const user = await this.get('user') as i.UserData;
    const items = await this.get('items');

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(items);
    }

    return items?.[user.server.slug]?.[user.faction]?.[itemName];
  }
}

const asyncStorage = new AsyncStorage();

export default asyncStorage;
