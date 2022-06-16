import type * as i from 'types';
import * as React from 'react';

import useStorageQuery from 'hooks/useStorageQuery';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';


const ServerName: React.VFC = () => {
  const { data: user } = useStorageQuery('user');
  const isClassicWowhead = useIsClassicWowhead();

  const serverName = React.useMemo((): string => {
    const version: i.Versions = isClassicWowhead ? 'classic' : 'retail';
    const serverName = user?.server[version];
    const region = user?.region?.toUpperCase();

    if (!serverName) {
      return 'Unknown';
    }

    if ('slug' in serverName) {
      const faction = user?.faction[serverName.slug];

      return `${serverName.name} ${region}-${faction}`;
    }

    return `${serverName.name}-${region}`;
  }, [isClassicWowhead, user]);

  return (
    <span className="q whtt-extra whtt-ilvl">
      <span className="capitalize">
        {serverName}
      </span>
    </span>
  );
};

export default ServerName;
