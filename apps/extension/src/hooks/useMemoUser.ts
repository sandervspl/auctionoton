import * as i from 'types';
import React from 'react';

import useStorageQuery from './useStorageQuery';
import useIsClassicWowhead from './useIsClassicWowhead';


function useMemoUser(): i.MemoUser {
  const { data: user } = useStorageQuery('user');
  const isClassicWowhead = useIsClassicWowhead();

  const memoUser = React.useMemo(() => {
    const server = isClassicWowhead
      ? user?.server.classic?.slug ?? ''
      : user?.server.retail?.name ?? '';

    return {
      server,
      faction: user?.faction[server.toLowerCase()]?.toLowerCase() ?? '',
      version: user?.version ?? '',
      region: user?.region ?? '',
    };
  }, [
    isClassicWowhead,
    user?.server.classic?.name,
    user?.server.retail?.name,
    user?.faction[user?.server.classic?.slug.toLowerCase() ?? ''],
    user?.faction[user?.server.retail?.name.toLowerCase() ?? ''],
    user?.version,
    user?.region,
  ]);

  return memoUser;
}

export type MemoUser = {
  server: string;
  faction: string;
  version: string;
  region: string;
};

export default useMemoUser;
