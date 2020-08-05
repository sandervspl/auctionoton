import React from 'react';

import realms from './realms';

function useServerList(region: string): JSX.Element[] {
  const [servers, setServers] = React.useState<JSX.Element[]>([]);

  React.useEffect(() => {
    const serverList: JSX.Element[] = [];

    switch (region) {
      case 'eu':
        let subregion: keyof typeof realms.eu;

        for (subregion in realms[region]) {
          for (const realm of realms[region][subregion]) {
            if (typeof realm === 'string') {
              const slug = realm
                .toLowerCase()
                .replace('\'', '')
                .replace(' ', '-');

              const value = JSON.stringify({
                name: realm,
                slug,
              });

              serverList.push(<option key={realm} value={value}>{realm}</option>);
            }

            if (typeof realm === 'object') {
              const value = JSON.stringify({
                name: realm.russian,
                slug: realm.english.toLowerCase(),
              });

              serverList.push(<option key={realm.russian} value={value}>{realm.russian}</option>);
            }
          }
        }
        break;
      case 'us':
        for (const realm of realms[region]) {
          const slug = realm
            .toLowerCase()
            .replace('\'', '')
            .replace(' ', '-');

          const value = JSON.stringify({
            name: realm,
            slug,
          });

          serverList.push(<option key={realm} value={value}>{realm}</option>);
        }
        break;
    }

    setServers(serverList);
  }, [region]);

  return servers;
};

export default useServerList;
