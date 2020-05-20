const asyncStorage = {
  get: <T extends StorageKeys>(key: T | T[]): Promise<Record<T, Storage[T]>> => (
    new Promise((resolve) => {
      // @ts-ignore
      chrome.storage.sync.get(key, (items) => resolve(items));
    })
  ),
  set: (data: Storage): Promise<void> => (
    new Promise((resolve) => {
      chrome.storage.sync.set(data, () => resolve());
    })
  ),
};

export default asyncStorage;

type Storage = {
  user: {
    server: string;
    faction: string;
  };
};

type StorageKeys = keyof Storage;
