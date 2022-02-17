import 'typed-query-selector';
import * as i from 'types';
import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider, useMutation } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { SubmitHandler, useForm } from 'react-hook-form';

import useServerList from 'hooks/useServerList';
import useStorageQuery from 'hooks/useStorageQuery';
import asyncStorage from 'utils/asyncStorage';


interface FlatRetailRealm {
  connectedRealmId: number;
  realmId: number;
  name: string;
}

interface FormInput {
  version: i.Versions;
  region: i.Regions;
  server: string;
  faction: i.Factions;
}


// Create a client
const queryClient = new QueryClient();


export const Form: React.FC = () => {
  const queries = new URLSearchParams(window.location.search);
  const { data: user, isFetching } = useStorageQuery('user');
  const userMutation = useMutation((data: FormInput) => {
    return asyncStorage.set('user', (draft) => {
      const serverOption = document.querySelector(`option[value="${data.server}"]`);
      const serverData = serverOption?.dataset.realm;

      draft = draft || {};
      draft.version = data.version;
      draft.region = data.region;

      if (serverData) {
        draft.server = draft.server || {};
        draft.server[data.version] = JSON.parse(serverData);

        if (data.server) {
          draft.faction = {
            ...user?.faction,
            [createSlug(data.server)]: data.faction,
          };
        }
      } else {
        console.error('Something went wrong parsing server data', { data, serverOption,  serverData });
      }
    });
  });
  const { register, handleSubmit, watch, setValue, formState, reset } = useForm<FormInput>({
    mode: 'all',
  });
  const { isValid } = formState;
  const watchRegion = watch('region');
  const watchVersion = watch('version');
  const watchServer = watch('server');
  const { serverList, retailServerData, isLoading } = useServerList(watchRegion, watchVersion);

  React.useEffect(() => {
    if (user?.version == null) {
      reset({
        version: 'classic',
        region: 'us',
        faction: 'Alliance',
      });
    } else if (!isFetching && user != null) {
      reset({
        version: user.version,
        region: user.region,
        server: user.version
          ? user.server?.[user.version]?.name
          : undefined,
        faction: user.server?.classic
          ? user.faction?.[user.server.classic.slug]
          : undefined,
      });
    }
  }, [isFetching, reset, user]);

  React.useEffect(() => {
    const storedServer = user?.server?.[watchVersion]?.name;
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

    if (!watchServer) {
      return;
    }

    const faction = user?.faction?.[createSlug(watchServer)];
    setValue('faction', faction || 'Alliance');
  }, [watchServer]);

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    userMutation.mutate(data);
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

  if (!user) {
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

      <div className="form-container">
        {isFetching ? <div>Loading...</div> : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <h2>Select your server</h2>

            <label htmlFor="version">
              Version
              <select {...register('version', { required: true })}>
                <option value="classic">Classic</option>
                <option value="retail">Retail</option>
              </select>
            </label>

            <label htmlFor="Region">
              Region
              <select {...register('region', { required: true })}>
                <option disabled value="default">Region</option>
                <option value="us">Americas and Oceania</option>
                <option value="eu">Europe</option>
                {watchVersion === 'retail' && (
                  <option value="kr">South-Korea</option>
                )}
              </select>
            </label>

            <label htmlFor="server">
              Server
              <select {...register('server', { required: true })}>
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
                    <option key={english} value={localized || english} data-realm={data}>
                      {localized || english}
                    </option>
                  );
                })}
              </select>
            </label>

            {watchVersion === 'classic' && (
              <label htmlFor="faction">
                Faction
                <select {...register('faction', { required: true })}>
                  <option value="Alliance">Alliance</option>
                  <option value="Horde">Horde</option>
                </select>
              </label>
            )}

            <button disabled={userMutation.isLoading || !isValid} type="submit">
              {userMutation.isLoading ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}

        {userMutation.status === 'success' && <div id="result">Saved succesfully!</div>}
      </div>
    </>
  );
};

async function main() {
  // await initState();

  ReactDOM.render(
    <QueryClientProvider client={queryClient}>
      <Form />
      <ReactQueryDevtools />
    </QueryClientProvider>,
    document.getElementById('root'),
  );
}

main();
