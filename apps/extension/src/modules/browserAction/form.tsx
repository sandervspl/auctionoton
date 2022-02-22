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
  const isLarge = queries.has('large');
  const { data: user, isLoading: isUserLoading } = useStorageQuery('user');
  const userMutation = useMutation(userMutateFn);
  const { register, handleSubmit, watch, setValue, formState, reset } = useForm<FormInput>({
    mode: 'all',
  });
  const { isValid } = formState;
  const watchRegion = watch('region');
  const watchVersion = watch('version');
  const watchServer = watch('server');
  const { serverList, retailServerData, isLoading } = useServerList(watchRegion, watchVersion);

  React.useLayoutEffect(() => {
    if (user?.version == null) {
      reset({
        version: 'classic',
        region: 'us',
        faction: 'Alliance',
        server: 'Anathema',
      });
    } else if (!isUserLoading && user != null) {
      reset({
        version: user.version,
        region: user.region,
        server: user.version
          ? user.server[user.version]?.name
          : undefined,
        faction: user.server.classic
          ? user.faction[user.server.classic.slug]
          : undefined,
      });
    }
  }, [isUserLoading, reset, user]);

  React.useEffect(() => {
    const storedServer = user?.server[watchVersion]?.name;
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

    const faction = user?.faction[createSlug(watchServer)];
    setValue('faction', faction || 'Alliance');
  }, [watchServer]);

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

  const onSubmit: SubmitHandler<FormInput> = async (data, e) => {
    e?.preventDefault();
    userMutation.mutate(data);
  };

  function userMutateFn(data: FormInput) {
    return asyncStorage.set('user', (draft) => {
      const server = serverList.find((names) => names.includes(data.server));
      if (!server) {
        throw Error('Could not find server');
      }

      const [english, localized] = server;
      const serverData = (() => {
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

      draft.version = data.version;
      draft.region = data.region;

      if (serverData) {
        draft.server[data.version] = JSON.parse(serverData);

        draft.faction = {
          ...user?.faction,
          [createSlug(data.server)]: data.faction,
        };
      } else {
        console.error('Something went wrong parsing server data', { data, server, serverData });
      }
    });
  }

  return (
    <div className="md:min-w-[600px] md:rounded-md">
      <div className="grid place-items-center mt-5 md:mt-0 md:items-st md:justify-items-center md:grid-cols-2 md:rounded-md">
        <div className="grid place-items-center md:bg-white md:dark:bg-slate-500 md:h-full md:w-full md:px-8 md:rounded-l-lg">
          <div className="grid place-items-center">
            <img src={`static/icon${isLarge ? '' : '-48'}.png`} alt="logo" />
            <h1 className="text-gray-500 text-sm md:text-center dark:text-slate-200">
              Auctionoton
              {isLarge ? (
                <>
                  <br />
                  Auction House Prices for Wowhead
                </>
              ) : null}
            </h1>
          </div>
        </div>

        <div className="py-0 px-9 md:w-full md:py-0 md:px-8 md:bg-gray-100 md:dark:bg-slate-600 md:rounded-r-lg">
          {(
            <form onSubmit={handleSubmit(onSubmit)}>
              <h2 className="my-5 mx-auto text-lg font-bold hidden md:block">
                Select your server
              </h2>

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
                  {serverList.map(([english, localized]) => (
                    <option key={english} value={localized || english}>
                      {localized || english}
                    </option>
                  ))}
                </select>
              </label>

              {(!watchVersion || watchVersion === 'classic') && (
                <label htmlFor="faction">
                  Faction
                  <select {...register('faction', { required: true })}>
                    <option value="Alliance">Alliance</option>
                    <option value="Horde">Horde</option>
                  </select>
                </label>
              )}

              <button
                disabled={userMutation.isLoading || !isValid}
                type="submit"
                className="submit-button"
              >
                {userMutation.isLoading ? 'Saving...' : 'Save'}
              </button>
            </form>
          )}

          {userMutation.status === 'success' && (
            <div className="grid place-items-center mx-auto mt-0 mb-5 text-sm text-green-500">
              Saved succesfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


ReactDOM.render(
  <QueryClientProvider client={queryClient}>
    <Form />
    <ReactQueryDevtools />
  </QueryClientProvider>,
  document.getElementById('root'),
);
