import * as i from 'types';
import * as React from 'react';
import { useQuery, useQueryClient, UseQueryResult } from 'react-query';

import asyncStorage from 'utils/asyncStorage';

function useStorageQuery<K extends i.StorageKeys>(key: K): UseQueryResult<i.BrowserStorage[K]> {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['storage', key],
    queryFn: async () => asyncStorage.get(key),
  });

  React.useEffect(() => {
    addon.storage.onChanged.addListener(() => {
      queryClient.invalidateQueries(['storage', key]);
    });
  }, []);

  return query;
}

export default useStorageQuery;
