import * as i from 'types';


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

  async addItem(name: string, data: i.CachedItemData): Promise<void> {
    const user = await this.get('user') as i.UserData;
    const cachedItems = await this.get('items') || {};
    const items = { ...cachedItems };

    items[user.server.slug] = items[user.server.slug] || {};
    items[user.server.slug][user.faction][name] = data;

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
