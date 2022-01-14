import * as i from 'types';
import produce from 'immer';
import _set from 'lodash/set';


if (__DEV__) {
  // addon.storage.local.clear();
}

class AsyncStorage {
  async getAll(): Promise<i.BrowserStorage> {
    return new Promise((resolve) => {
      addon.storage.local.get(null, (data) => {
        return resolve(data as i.BrowserStorage);
      });
    });
  }

  get = async <T extends i.StorageKeys>(key: T): Promise<i.BrowserStorage[T] | undefined> => {
    return new Promise((resolve) => {
      addon.storage.local.get(key, (items) => {
        return resolve(items[key]);
      });
    });
  };

  set = async <T extends i.StorageKeys>(key: T, update: (draft: i.BrowserStorage[T]) => void): Promise<void> => {
    const cur = await this.get(key);
    const next = produce(cur || {}, update);

    return new Promise((resolve) => {
      addon.storage.local.set({ [key]: next }, resolve);
    });
  };

  clear = async <T extends i.StorageKeys>(key: T): Promise<void> => {
    return new Promise((resolve) => {
      addon.storage.local.set({ [key]: {} }, resolve);
    });
  };

  getKeyFromQueryKey = (itemQueryKey: i.ItemQueryKeyCtx) => {
    const [, itemObj] = itemQueryKey.queryKey;

    return JSON.stringify(itemObj);
  };

  addItem = async (itemQueryKey: i.ItemQueryKeyCtx, data: i.MaybeAnyItem): Promise<void> => {
    await this.set('items', (draftState) => {
      if (draftState != null) {
        _set(draftState, this.getKeyFromQueryKey(itemQueryKey), data);
      }
    });
  };

  getItem = async (itemQueryKey: i.ItemQueryKeyCtx, cb?: (item: i.MaybeAnyItem | undefined) => void): Promise<i.MaybeAnyItem> => {
    const items = await this.get('items');
    const key = this.getKeyFromQueryKey(itemQueryKey);
    const item = items?.[key];

    if (cb) {
      cb(item);
    }

    return item;
  };
}

const asyncStorage = new AsyncStorage();

export default asyncStorage;
