import * as i from './types';

abstract class AsyncStorage {
  static get <T extends StorageKeys>(key: T | T[]): Promise<Storage[T] | undefined> {
    return new Promise((resolve) => {
      // @ts-ignore
      chrome.storage.sync.get(key, (items) => resolve(items[key]));
    });
  }

  static async set <T extends StorageKeys>(data: Record<T, Storage[T]>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set(data, () => resolve());
    });
  }

  static async addItem(data: Record<string, i.CachedItemData>): Promise<void> {
    const items = await AsyncStorage.get('items');

    const newItems = {
      ...items,
      ...data,
    };

    await AsyncStorage.set({ items: newItems });
  }

  static async getItem(itemName: string): Promise<i.CachedItemData | undefined> {
    const items = await AsyncStorage.get('items');

    return items?.[itemName];
  }
}

export default AsyncStorage;

type Storage = {
  user: {
    server: string;
    faction: string;
  };
  items: Record<string, i.CachedItemData>;
};

type StorageKeys = keyof Storage;
