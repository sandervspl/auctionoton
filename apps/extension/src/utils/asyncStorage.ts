import * as i from 'types';
import { produce } from 'immer';
import _set from 'lodash/set';

class AsyncStorage {
  async getAll(): Promise<i.BrowserStorage> {
    return new Promise((resolve) => {
      addon.storage.local.get(null, (data) => {
        return resolve(data as i.BrowserStorage);
      });
    });
  }

  get = async <T extends i.StorageKeys>(key: T): Promise<i.BrowserStorage[T]> => {
    return new Promise((resolve) => {
      addon.storage.local.get(key, (items) => {
        return resolve(items[key]);
      });
    });
  };

  set = async <T extends i.StorageKeys>(
    key: T,
    update: (draft: i.BrowserStorage[T]) => void,
  ): Promise<void> => {
    const cur = await this.get(key);
    const next = produce(cur || {}, update);

    return new Promise((resolve) => {
      addon.storage.local.set({ [key]: next }, resolve);
    });
  };

  clear = async <T extends i.StorageKeys>(key?: T): Promise<void> => {
    return new Promise((resolve) => {
      if (key) {
        addon.storage.local.set({ [key]: {} }, resolve);
      } else {
        this.init(resolve);
      }
    });
  };

  getKeyFromQueryKey = (itemQueryKey: i.ItemQueryKeyCtx) => {
    const [, itemObj] = itemQueryKey.queryKey;
    return `${itemObj.itemId}-${itemObj.region}-${itemObj.realm}-${itemObj.faction}-${itemObj.version}`;
  };

  addItem = async (
    itemQueryKey: i.ItemQueryKeyCtx,
    data: i.CachedItemDataClassic,
  ): Promise<void> => {
    await this.set('items', (draftState) => {
      if (draftState != null) {
        _set(draftState, this.getKeyFromQueryKey(itemQueryKey), data);
      }
    });
  };

  getItem = async (
    itemQueryKey: i.ItemQueryKeyCtx,
    cb?: (item: i.CachedItemDataClassic | undefined) => void,
  ): Promise<i.CachedItemDataClassic> => {
    const items = await this.get('items');
    const key = this.getKeyFromQueryKey(itemQueryKey);
    const item = items?.[key];

    if (cb) {
      cb(item);
    }

    return item;
  };

  init = async (cb?: () => void) => {
    const items: i.ItemsData = {};
    const user: Partial<i.UserData> = {
      realms: {},
      faction: {},
    };
    const ui: i.UiData = {
      showTip: {
        shiftKey: true,
      },
    };

    addon.storage.local.set({ items, ui, user }).then(cb);
  };
}

const asyncStorage = new AsyncStorage();

if (__DEV__) {
  // asyncStorage.clear();
}

export default asyncStorage;
