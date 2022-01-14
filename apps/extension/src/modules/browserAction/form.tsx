import 'typed-query-selector';
import * as i from 'types';
import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SubmitHandler, useForm } from 'react-hook-form';

import { useStore } from 'state/store';
import useServerList from 'hooks/useServerList';


interface FlatRetailRealm {
  connectedRealmId: number;
  realmId: number;
  name: string;
}

interface FormInput {
  version: i.Versions | 'default';
  region: i.Regions | 'default';
  server: string;
  faction: i.Factions;
}


// Create a client
const queryClient = new QueryClient();


export const Form: React.FC = () => {
  const queries = new URLSearchParams(window.location.search);
  const storage = useStore((store) => store.storage);
  const { register, handleSubmit, watch, setValue } = useForm<FormInput>();
  const watchRegion = watch('region');
  const watchVersion = watch('version');
  const watchServer = watch('server');
  const [saved, setSaved] = React.useState(false);
  const { serverList, retailServerData, isLoading } = useServerList(watchRegion, watchVersion);

  React.useEffect(() => {
    if (isLoading) {
      return setValue('server', 'loading');
    }

    if (watchVersion === 'default') {
      return;
    }

    const storedServer = storage.user?.server?.[watchVersion]?.name;
    const firstServerInlist = serverList[0]?.[0];

    if (storedServer && serverList.find((arr) => arr[0] === storedServer)) {
      setValue('server', storedServer);
    } else {
      setValue('server', firstServerInlist);
    }
  }, [serverList, watchVersion, isLoading]);

  React.useEffect(() => {
    if (watchVersion !== 'classic') {
      return;
    }

    const faction = storage.user?.faction?.[createSlug(watchServer)];
    setValue('faction', faction || 'Alliance');
  }, [watchServer]);

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    setSaved(false);

    const serverOption = document.querySelector(`option[value="${data.server}"]`);
    const serverData = serverOption?.dataset.realm;

    await storage.actions.save('user', (draftState) => {
      draftState = draftState || {};

      if (data.version !== 'default') {
        draftState.version = data.version;
      }

      if (data.region !== 'default') {
        draftState.region = data.region;
      }

      if (serverData) {
        draftState.server = draftState.server || {};

        if (data.version !== 'default') {
          draftState.server[data.version] = JSON.parse(serverData);
        }

        draftState.faction = {
          ...storage.user?.faction,
          [createSlug(data.server)]: data.faction,
        };
      } else {
        console.error('Something went wrong parsing server data', { data, serverOption,  serverData });
      }
    });

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 5000);
  };

  function createSlug(name: string): string {
    return name
      .toLowerCase()
      .replace('\'', '')
      .replace(' ', '-');
  }

  function createValue(realm: string | FlatRetailRealm, slug?: string): string {
    if (typeof realm === 'string') {
      return JSON.stringify({
        name: realm,
        slug: createSlug(slug || realm),
      });
    }

    return JSON.stringify(realm);
  }

  if (!storage.user) {
    return null;
  }

  const isLarge = queries.has('large');

  return (
    <>
      <img src={`static/icon${isLarge ? '' : '-48'}.png`} alt="logo" />
      <h1>
        Auctionoton
        {isLarge ? ' - Auction House Prices for Wowhead' : ''}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <h2>Select your server</h2>

        <select defaultValue={storage.user?.version || 'default'} {...register('version')}>
          <option disabled value="default">WoW Version</option>
          <option value="classic">Classic</option>
          <option value="retail">Retail</option>
        </select>

        <select defaultValue={storage.user?.region || 'default'} {...register('region')}>
          <option disabled value="default">Region</option>
          <option value="us">Americas and Oceania</option>
          <option value="eu">Europe</option>
          {watchVersion === 'retail' && (
            <option value="kr">South-Korea</option>
          )}
        </select>

        {watchVersion !== 'default' && watchRegion !== 'default' && (
          <select
            defaultValue={storage.user?.server?.[watchVersion]?.name || 'default'}
            {...register('server')}
          >
            <option disabled value="default">Server</option>
            {serverList.map((server) => {
              const [english, localized] = server;
              const data = (() => {
                if (watchVersion === 'classic') {
                  return createValue(localized || english, english);
                }

                if (retailServerData) {
                  return JSON.stringify({
                    ...retailServerData[english],
                    name: english,
                  });
                }
              })();

              return (
                <option
                  key={english}
                  value={localized || english}
                  data-realm={data}
                >
                  {localized || english}
                </option>
              );
            })}
          </select>
        )}

        {watchVersion === 'classic' && (
          <select
            defaultValue={storage.user?.server?.classic
              ? storage.user?.faction?.[storage.user?.server?.classic?.slug]
              : 'Alliance'}
            {...register('faction')}
          >
            <option value="Alliance">Alliance</option>
            <option value="Horde">Horde</option>
          </select>
        )}

        <button type="submit">Save</button>
      </form>

      {saved && <div id="result">Saved succesfully!</div>}
    </>
  );
};

async function main() {
  await useStore.getState().storage.actions.init();

  ReactDOM.render(
    <QueryClientProvider client={queryClient}>
      <Form />
    </QueryClientProvider>,
    document.getElementById('root'),
  );
}

main();
