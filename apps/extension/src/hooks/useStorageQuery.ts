import * as i from 'types';
import { useQuery } from '@tanstack/react-query';
import { storage } from 'wxt/storage';

function useStorageQuery<K extends i.StorageKeys>(key: K) {
  const query = useQuery({
    queryKey: ['storage', key],
    queryFn: async () => storage.getItem<i.BrowserStorage[K]>(`local:${key}`),
  });

  return query;
}

export default useStorageQuery;
