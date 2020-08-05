import React from 'react';
import * as i from './types';
import asyncStorage from './asyncStorage';

function useAsyncStorage<T extends i.StorageKeys>(key: T): readonly [i.Storage[T] | undefined, (data: Record<T, i.Storage[T]>) => Promise<void>] {
  const [storage, setStorage] = React.useState<i.Storage[T]>();

  React.useEffect(() => {
    asyncStorage.get(key).then(setStorage);
  }, []);

  const saveStorage = async (data: Record<T, i.Storage[T]>) => {
    await asyncStorage.set(data);
  };

  return [storage, saveStorage] as const;
}

export default useAsyncStorage;
