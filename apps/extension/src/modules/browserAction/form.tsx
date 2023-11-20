import 'typed-query-selector';
import * as i from 'types';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, useMutation } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { SubmitHandler, useForm } from 'react-hook-form';

import useServerList from 'hooks/useServerList';
import useStorageQuery from 'hooks/useStorageQuery';
import asyncStorage from 'utils/asyncStorage';

interface FormInput {
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
  const watchServer = watch('server');
  const { serverList } = useServerList(watchRegion);

  React.useLayoutEffect(() => {
    if (user?.server == null) {
      reset({
        region: 'us',
        faction: 'Alliance',
        server: 'Anathema',
      });
    } else if (!isUserLoading && user != null) {
      reset({
        region: user.region,
        server: user.server.classic?.name,
        faction: user.server.classic ? user.faction[user.server.classic.slug] : undefined,
      });
    }
  }, [isUserLoading, reset, user]);

  React.useEffect(() => {
    const storedServer = user?.server.classic?.name;
    const firstServerInlist = serverList[0]?.[0];

    if (storedServer && serverList.find((arr) => arr[0] === storedServer)) {
      setValue('server', storedServer);
    } else {
      setValue('server', firstServerInlist);
    }
  }, [serverList]);

  React.useEffect(() => {
    if (!watchServer) {
      return;
    }

    const faction = user?.faction[createSlug(watchServer)];
    setValue('faction', faction || 'Alliance');
  }, [watchServer]);

  function createSlug(name: string): string {
    return name.toLowerCase().replace("'", '').replace(' ', '-');
  }

  function createValue(realm: string, slug?: string): string {
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
        return createValue(localized || english, english);
      })();

      draft.region = data.region;

      if (serverData) {
        draft.server ||= {};
        draft.server.classic = JSON.parse(serverData);

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
    <div className="md:auc-min-w-[600px] md:auc-rounded-md">
      <div className="md:auc-items-st auc-mt-5 auc-grid auc-place-items-center md:auc-mt-0 md:auc-grid-cols-2 md:auc-justify-items-center md:auc-rounded-md">
        <div className="auc-grid auc-place-items-center md:auc-h-full md:auc-w-full md:auc-rounded-l-lg md:auc-bg-white md:auc-px-8 md:dark:auc-bg-slate-500">
          <div className="auc-grid auc-place-items-center">
            <img src={`static/icon${isLarge ? '' : '-48'}.png`} alt="logo" />
            <h1 className="auc-text-sm auc-text-gray-500 dark:auc-text-slate-200 md:auc-text-center">
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

        <div className="auc-py-0 auc-px-9 md:auc-w-full md:auc-rounded-r-lg md:auc-bg-gray-100 md:auc-py-0 md:auc-px-8 md:dark:auc-bg-slate-600">
          {
            <form onSubmit={handleSubmit(onSubmit)}>
              <h2 className="auc-my-5 auc-mx-auto auc-hidden auc-text-lg auc-font-bold md:auc-block">
                Select your server
              </h2>

              <label htmlFor="Region">
                Region
                <select {...register('region', { required: true })}>
                  <option value="us">Americas and Oceania</option>
                  <option value="eu">Europe</option>
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

              <label htmlFor="faction">
                Faction
                <select {...register('faction', { required: true })}>
                  <option value="Alliance">Alliance</option>
                  <option value="Horde">Horde</option>
                </select>
              </label>

              <button
                disabled={userMutation.isLoading || !isValid}
                type="submit"
                className="submit-button"
              >
                {userMutation.isLoading ? 'Saving...' : 'Save'}
              </button>
            </form>
          }

          {userMutation.status === 'success' && (
            <div className="auc-mx-auto auc-mt-0 auc-mb-5 auc-grid auc-place-items-center auc-text-sm auc-text-green-500">
              Saved succesfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <Form />
      <ReactQueryDevtools />
    </QueryClientProvider>,
  );
}
