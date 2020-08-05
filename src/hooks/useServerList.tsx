import React from 'react';

import realms from 'src/constants/realms';


function useServerList(region: string): JSX.Element[] {
  const [servers, setServers] = React.useState<JSX.Element[]>([]);

  function createSlug(name: string): string {
    return name
      .toLowerCase()
      .replace('\'', '')
      .replace(' ', '-');
  }

  function createValue(name: string, slug?: string): string {
    return JSON.stringify({
      name,
      slug: createSlug(slug || name),
    });
  }

  React.useEffect(() => {
    const serverList: JSX.Element[] = [];

    switch (region) {
      case 'eu':
        let subregion: keyof typeof realms.eu;

        for (subregion in realms[region]) {
          for (const realm of realms[region][subregion]) {
            if (typeof realm === 'string') {
              const value = createValue(realm);

              serverList.push(
                <option key={realm} value={value}>{realm}</option>,
              );
            }

            if (typeof realm === 'object') {
              const value = createValue(realm.russian, realm.english);

              serverList.push(
                <option key={realm.russian} value={value}>{realm.russian}</option>,
              );
            }
          }
        }
        break;
      case 'us':
        for (const realm of realms[region]) {
          const value = createValue(realm);

          serverList.push(
            <option key={realm} value={value}>{realm}</option>,
          );
        }
        break;
    }

    setServers(serverList);
  }, [region]);

  return servers;
};

export default useServerList;
