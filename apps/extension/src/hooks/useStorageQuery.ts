import * as i from 'types';
import * as React from 'react';
import { useQuery, UseQueryResult } from 'react-query';

import asyncStorage from 'utils/asyncStorage';


function useStorageQuery<K extends i.StorageKeys>(key: K): UseQueryResult<i.BrowserStorage[K]> {
  const query = useQuery(['storage', key], () => asyncStorage.get(key));

  React.useEffect(() => {
    addon.storage.onChanged.addListener(({ user }) => {
      if (!user) {
        return;
      }

      query.refetch();
    });
  }, []);

  return query;
}

export default useStorageQuery;
