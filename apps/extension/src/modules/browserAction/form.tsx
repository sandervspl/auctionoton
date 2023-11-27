import 'typed-query-selector';
import * as i from 'types';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, useMutation } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { SubmitHandler, useForm } from 'react-hook-form';

import useRealmsList from 'hooks/useRealmsList';
import useStorageQuery from 'hooks/useStorageQuery';
import asyncStorage from 'utils/asyncStorage';
import slugify from 'slugify';

interface FormInput {
  region: i.Regions;
  realm: string;
  faction: i.Factions;
  version: i.Version;
}

// Create a client
const queryClient = new QueryClient();

export const Form: React.FC = () => {
  const queries = new URLSearchParams(window.location.search);
  const isLarge = queries.has('large');
  const { data: user, isLoading: isUserLoading } = useStorageQuery('user');
  const userMutation = useMutation({ mutationFn: userMutateFn });
  const { register, handleSubmit, watch, setValue, formState, reset } = useForm<FormInput>({
    mode: 'all',
  });
  const { isValid } = formState;
  const watchRegion = watch('region');
  const watchVersion = watch('version');
  const watchRealm = watch('realm');
  const realms = useRealmsList(watchRegion, watchVersion);

  React.useLayoutEffect(() => {
    if (user?.server == null) {
      reset({
        region: 'eu',
        faction: 'Horde',
        realm: 'Gehennas',
        version: 'classic',
      });
    } else if (!isUserLoading && user != null) {
      reset({
        region: user.region,
        realm: user.server.classic?.name,
        faction: user.server.classic ? user.faction[user.server.classic.slug] : undefined,
      });
    }
  }, [isUserLoading, reset, user]);

  React.useEffect(() => {
    if (!realms.data) {
      return;
    }

    const storedRealm = user?.server.classic?.name;
    const firstRealmInlist = realms.data.find((realm) => realm.region === watchRegion)?.name;

    if (
      storedRealm &&
      realms.data.find(
        (realm) =>
          realm.name.toLowerCase() === storedRealm.toLowerCase() &&
          realm.region === watchRegion &&
          realm.version === watchVersion,
      )
    ) {
      setValue('realm', storedRealm);
    } else if (firstRealmInlist) {
      setValue('realm', firstRealmInlist);
    }
  }, [realms.data, watchRegion, watchVersion]);

  React.useEffect(() => {
    if (!watchRealm) {
      return;
    }

    const faction = user?.faction[slugify(watchRealm)];
    setValue('faction', faction || 'Alliance');
  }, [watchRealm]);

  const onSubmit: SubmitHandler<FormInput> = async (data, e) => {
    e?.preventDefault();
    userMutation.mutate(data);
  };

  function userMutateFn(data: FormInput) {
    if (!realms.data) {
      throw Error('No realms found');
    }

    return asyncStorage.set('user', (draft) => {
      const realm = realms.data.find((realm) =>
        realm.name.toLowerCase().includes(data.realm.toLowerCase()),
      );
      if (!realm) {
        throw Error('Could not find realm');
      }

      draft.region = data.region;
      draft.version = data.version;
      draft.server ||= {};
      draft.server.classic = {
        name: realm.name,
        slug: slugify(realm.name),
      };

      draft.faction = {
        ...user?.faction,
        [slugify(data.realm)]: data.faction,
      };
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
                Select your realm
              </h2>

              <label htmlFor="Region">
                Region
                <select {...register('region', { required: true })}>
                  <option value="us">Americas and Oceania</option>
                  <option value="eu">Europe</option>
                </select>
              </label>

              <label htmlFor="Region">
                Game Version
                <select {...register('version', { required: true })}>
                  <option value="classic">Classic</option>
                  <option value="era">Era</option>
                </select>
              </label>

              <label htmlFor="realm">
                Realm
                <select {...register('realm', { required: true })}>
                  {realms.data
                    ?.filter(
                      (realm) => realm.region === watchRegion && realm.version === watchVersion,
                    )
                    .map((realm) => (
                      <option key={realm.id} value={realm.name}>
                        {realm.name}
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
