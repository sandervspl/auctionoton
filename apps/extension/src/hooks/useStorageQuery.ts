import * as i from 'types';
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { asyncStorage } from 'utils';

function useStorageQuery<K extends i.StorageKeys>(key: K) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['storage', key],
    queryFn: async () => asyncStorage.get<K>(key),
  });

  React.useEffect(() => {
    addon.storage.onChanged.addListener(() => {
      queryClient.invalidateQueries({ refetchType: 'all' });
    });
  }, [queryClient.invalidateQueries]);

  return query;
}

export default useStorageQuery;
