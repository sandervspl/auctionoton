import * as i from 'types';
import React from 'react';

import useStorageQuery from './useStorageQuery';
import useIsClassicWowhead from './useIsClassicWowhead';


function useMemoUser(): { server: string; faction: string; version?: i.Versions } {
  const { data: user } = useStorageQuery('user');
  const isClassicWowhead = useIsClassicWowhead();

  const memoUser = React.useMemo(() => {
    let server = '';
    let faction = '';

    if (isClassicWowhead) {
      server = user?.server.classic?.slug ?? '';
    } else {
      server = user?.server.retail?.name ?? '';
    }

    faction = user?.faction[server.toLowerCase()]?.toLowerCase() ?? '';

    return {
      server,
      faction,
      version: user?.version,
    };
  }, [
    isClassicWowhead,
    user?.server.classic?.name,
    user?.server.retail?.name,
    user?.faction[user?.server.classic?.slug.toLowerCase() ?? ''],
    user?.faction[user?.server.retail?.name.toLowerCase() ?? ''],
    user?.version,
  ]);

  return memoUser;
}

export default useMemoUser;
