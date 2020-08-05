import * as i from 'types';
import React from 'react';

import asyncStorage from 'utils/asyncStorage';


type UseAsyncStorage<T extends i.StorageKeys> =
  readonly [i.Storage[T] | undefined, (data: Record<T, i.Storage[T]>) => Promise<void>];


function useAsyncStorage<T extends i.StorageKeys>(key: T): UseAsyncStorage<T> {
  const [storage, setStorage] = React.useState<i.Storage[T]>();

  function getStorage() {
    asyncStorage.get(key).then(setStorage);
  }

  async function saveStorage(data: Record<T, i.Storage[T]>) {
    await asyncStorage.set(data);
  };

  // Memoize the listener to only apply it once
  React.useMemo(() => {
    // Listen to changes made to the browser storage
    addon.storage.onChanged.addListener((changes) => {
      if (key === 'user' && changes.user) {
        getStorage();
      }
    });
  }, []);

  React.useEffect(() => {
    getStorage();
  }, []);

  return [storage, saveStorage] as const;
}

export default useAsyncStorage;
