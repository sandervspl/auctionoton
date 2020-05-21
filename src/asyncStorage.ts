import * as i from './types';

abstract class AsyncStorage {
  static get <T extends StorageKeys>(key: T): Promise<Storage[T] | undefined> {

    return new Promise((resolve) => {
      chrome.storage.sync.get(key, (items) => {
        return resolve(items[key]);
      });
    });
  }

  static async set <T extends StorageKeys>(data: Record<T, Storage[T]>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set(data, () => {
        return resolve();
      });
    });
  }

  static async addItem(data: Record<string, i.CachedItemData>, serverSlug: string, faction: string): Promise<void> {
    const items = await AsyncStorage.get('items') || {};

    items[serverSlug] = items[serverSlug] || {};
    items[serverSlug][faction] = data;

    await AsyncStorage.set({ items });
  }

  static async getItem(itemName: string, serverSlug: string, faction: string): Promise<i.CachedItemData | undefined> {
    const items = await AsyncStorage.get('items');

    return items?.[serverSlug]?.[faction]?.[itemName];
  }
}

export default AsyncStorage;

type Storage = {
  user: i.UserData;
  items: {
    [serverSlug: string]: {
      [faction: string]: {
        [itemName: string]: i.CachedItemData;
      };
    };
  };
};

type StorageKeys = keyof Storage;
