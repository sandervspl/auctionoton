import * as i from 'types';
import React from 'react';

import realms from 'src/constants/realms';

function useServerList(region?: i.Regions) {
  const [servers, setServers] = React.useState<string[][]>([]);

  React.useEffect(() => {
    const serverList: string[][] = [];

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

    setServers(serverList);
  }, [region]);

  return {
    serverList: servers,
  };
}

export default useServerList;
