import * as i from 'types';
import React from 'react';
import { useQuery } from 'react-query';

import realms from 'src/constants/realms';
import time from 'utils/time';
import api from 'utils/api';


interface UseServerList {
  serverList: string[][];
  isLoading: boolean;
  retailServerData?: i.RetailRealmResult;
}


function useServerList(region?: i.Regions, version?: i.Versions): UseServerList {
  const [servers, setServers] = React.useState<string[][]>([]);
  const { data: retailServers, isLoading } = useQuery(
    ['servers', { region }],
    region != null
      ? () => api.getRetailRealms(region)
      : () => void {},
    {
      refetchOnWindowFocus: false, // Generally just annoying, especially when fetch is failing
      staleTime: time.hours(24),
    },
  );

  React.useEffect(() => {
    const serverList: string[][] = [];

    if (version === 'classic') {
      switch (region) {
        case 'eu':
          let subregion: keyof typeof realms.eu;

          for (subregion in realms[region]) {
            for (const realm of realms[region][subregion]) {
              if (typeof realm === 'string') {
                serverList.push([realm]);
              }

              if (typeof realm === 'object') {
                serverList.push([realm.english, realm.russian]);
              }
            }
          }
          break;
        case 'us':
          for (const realm of realms[region]) {
            serverList.push([realm]);
          }
          break;
      }
    } else {
      if (retailServers) {
        const serverNames: string[] = Object.keys(retailServers)
          .map((key) => key)
          .sort((a, b) => a.localeCompare(b));

        for (const name of serverNames) {
          serverList.push([name]);
        }
      }
    }

    setServers(serverList);
  }, [region, version, retailServers, isLoading]);

  return {
    serverList: servers,
    retailServerData: retailServers,
    isLoading,
  };
}

export default useServerList;
