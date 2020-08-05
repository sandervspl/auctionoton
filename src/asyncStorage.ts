import * as i from './types';

class AsyncStorage {
  async get <T extends i.StorageKeys>(key: T): Promise<i.Storage[T] | undefined> {
    return new Promise((resolve) => {
      addon.storage.sync.get(key, (items) => {
        return resolve(items[key]);
      });
    });
  }

  async set <T extends i.StorageKeys>(data: Record<T, i.Storage[T]>): Promise<void> {
    return new Promise((resolve) => {
      addon.storage.sync.set(data, () => {
        return resolve();
      });
    });
  }

  async addItem(data: Record<string, i.CachedItemData>, serverSlug: string, faction: string): Promise<void> {
    const items = await this.get('items') || {};

    items[serverSlug] = items[serverSlug] || {};
    items[serverSlug][faction] = data;

    await this.set({ items });
  }

  async getItem(itemName: string, serverSlug: string, faction: string): Promise<i.CachedItemData | undefined> {
    const items = await this.get('items');

    return items?.[serverSlug]?.[faction]?.[itemName];
  }
}

const asyncStorage = new AsyncStorage();

export default asyncStorage;
