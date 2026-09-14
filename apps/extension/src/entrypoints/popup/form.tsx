import 'typed-query-selector';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { produce } from 'immer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { type SubmitHandler, useForm } from 'react-hook-form';
import slugify from 'slugify';
import * as i from 'types';
import { storage } from 'wxt/storage';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import useRealmsList from '@/hooks/useRealmsList';
import useStorageQuery from '@/hooks/useStorageQuery';
import { foreverRealms, isVersionAvailable, versionGroup } from '@/utils/gameVersions';
import { selectRealm } from '@/utils/realms';

interface FormInput {
  region: i.Regions;
  realm: string;
  faction: i.Factions;
  version: i.GameVersion;
}

// Create a client
const queryClient = new QueryClient();

export const RealmForm: React.FC = () => {
  const { data: user } = useStorageQuery('user');
  const [now, setNow] = React.useState(Date.now);
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const client = useQueryClient();
  const userMutation = useMutation({
    mutationFn: userMutateFn,
    onSuccess: (nextUser) => client.setQueryData(['storage', 'user'], nextUser),
  });
  const form = useForm<FormInput>({
    mode: 'onSubmit',
    defaultValues: {
      version: 'classic',
      realm: '',
    },
  });
  const watchRegion = form.watch('region');
  const watchVersion = form.watch('version');
  const watchRealm = form.watch('realm');
  const realms = useRealmsList(watchRegion, watchVersion);
  const watchFaction = form.watch('faction');
  const hydrated = React.useRef(false);
  const selectedRealm = realms.data?.find((realm) => realm.name === watchRealm);
  const selectedHouse = selectedRealm?.auctionHouses.find((house) => house.type === watchFaction);

  React.useEffect(() => {
    if (hydrated.current || user === undefined) return;
    hydrated.current = true;
    if (!user || form.formState.isDirty) return;
    const version = user.version && isVersionAvailable(user.version) ? user.version : 'classic';
    const realm = user.realms?.[version]?.name || '';
    form.reset({
      region: user.region,
      realm,
      faction: user.faction?.[realm],
      version,
    });
  }, [user, form.formState.isDirty, form.reset]);

  React.useEffect(() => {
    if (!realms.data) return;
    const storedRealm = user?.region === watchRegion ? user.realms?.[watchVersion] : undefined;
    form.setValue('realm', selectRealm(realms.data, form.getValues('realm'), storedRealm));
  }, [user, realms.data, watchRegion, watchVersion, form.setValue, form.getValues]);

  React.useEffect(() => {
    if (!watchRealm) return;
    form.setValue('faction', user?.faction?.[watchRealm] || 'Alliance');
  }, [watchRealm, form.setValue, user?.faction]);

  React.useEffect(() => {
    const saved = userMutation.variables;
    if (
      !userMutation.isPending &&
      saved &&
      (saved.region !== watchRegion ||
        saved.version !== watchVersion ||
        saved.realm !== watchRealm ||
        saved.faction !== watchFaction)
    )
      userMutation.reset();
  }, [
    watchRegion,
    watchVersion,
    watchRealm,
    watchFaction,
    userMutation.variables,
    userMutation.isPending,
    userMutation.reset,
  ]);

  function changeVersion(version: i.GameVersion) {
    if (!isVersionAvailable(version)) return;
    form.setValue('realm', '');
    form.setValue('version', version, { shouldDirty: true });
  }

  const onSubmit: SubmitHandler<FormInput> = async (data, e) => {
    e?.preventDefault();
    userMutation.mutate(data);
  };

  async function userMutateFn(data: FormInput) {
    const realm = realms.data?.find((realm) => realm.name === data.realm);
    const house = realm?.auctionHouses.find((house) => house.type === data.faction);
    if (!isVersionAvailable(data.version) || !data.region || !realm || !house || realms.isError) {
      throw Error('Select an available realm and faction before saving.');
    }

    const nextUser = produce(user ?? ({} as i.UserData), (draft) => {
      draft.region = data.region;
      draft.version = data.version;
      draft.realms ||= {};
      draft.realms[data.version] = {
        name: realm.name,
        slug: slugify(realm.name),
        auctionHouseId: house.auctionHouseId,
      };
      draft.isActive = {
        ...draft.isActive,
        [versionGroup(data.version)]: data.version,
      };

      draft.faction = {
        ...user?.faction,
        [data.realm]: data.faction,
      };
    });

    await storage.setItem('local:user', nextUser);
    return nextUser;
  }

  return (
    <Form {...form}>
      <form
        className="auc-mx-auto md:auc-max-w-md auc-space-y-6 auc-p-6 auc-w-full"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="auc-space-y-2 auc-text-center auc-gap-4 auc-flex auc-items-center md:auc-block">
          <img alt="Logo" src="/icon/icon.png" className="auc-mx-auto auc-hidden md:auc-block" />
          <img alt="Logo" src="/icon/48.png" className="auc-block md:auc-hidden" />
          <h1 className="auc-text-lg md:auc-text-3xl auc-font-bold">Auctionoton</h1>
          <p className="auc-text-zinc-500 dark:auc-text-zinc-400 auc-hidden md:auc-block">
            Select your realm to see auction house prices on Wowhead
          </p>
        </div>
        <div className="auc-space-y-6 auc-w-full">
          <div>
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem className="auc-space-y-1">
                  <FormLabel>Game Version</FormLabel>
                  <FormControl>
                    <NativeSelect
                      {...field}
                      onChange={(event) => changeVersion(event.target.value as i.GameVersion)}
                    >
                      <option value="classic">Classic (progression)</option>
                      <option value="anniversary">TBC Anniversary</option>
                      <option value="era">Era</option>
                      <option value="hardcore">Hardcore</option>
                      <option value="seasonal">Season of Discovery</option>
                      <option value="forever" disabled={!isVersionAvailable('forever', now)}>
                        {isVersionAvailable('forever', now)
                          ? 'Forever'
                          : 'Forever (November 4, 2026)'}
                      </option>
                    </NativeSelect>
                  </FormControl>
                  <p className="auc-text-sm auc-text-zinc-500">
                    Forever realms: {foreverRealms.join(', ')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <NativeSelect
                      {...field}
                      value={field.value || ''}
                      onChange={(event) => {
                        form.setValue('realm', '');
                        field.onChange(event);
                      }}
                    >
                      <option value="" disabled>
                        Select region
                      </option>
                      <option value="eu">Europe</option>
                      <option value="us">North America</option>
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
              name="realm"
              render={({ field }) => (
                <FormItem className="auc-space-y-1">
                  <FormLabel>Realm</FormLabel>
                  {realms.isLoading ? (
                    <Skeleton className="auc-h-[40px]" />
                  ) : (
                    <FormControl>
                      <NativeSelect
                        {...field}
                        value={field.value || ''}
                        disabled={!watchRegion || !realms.data?.length || realms.isError}
                      >
                        <option value="" disabled>
                          {watchRegion ? 'Select realm' : 'Choose a region first'}
                        </option>
                        {watchVersion === 'forever' &&
                          foreverRealms
                            .filter(
                              (name) =>
                                !realms.data?.some(
                                  (realm) => realm.name.toLowerCase() === name.toLowerCase(),
                                ),
                            )
                            .map((name) => (
                              <option key={name} value={name} disabled>
                                {name} (awaiting realm data)
                              </option>
                            ))}
                        {realms.data?.map((realm) => (
                          <option key={realm.realmId} value={realm.name}>
                            {realm.localizedName}
                          </option>
                        ))}
                      </NativeSelect>
                    </FormControl>
                  )}
                  {realms.isError && (
                    <p role="alert" className="auc-text-sm auc-text-red-600 dark:auc-text-red-400">
                      Could not load realms. Check your connection and try again.
                    </p>
                  )}
                  {realms.isSuccess && realms.data.length === 0 && (
                    <output className="auc-block auc-text-sm">
                      No realms are available for this game version and region.
                    </output>
                  )}
                  {watchRegion && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={realms.isFetching}
                      onClick={() => void realms.refetch()}
                    >
                      {realms.isFetching
                        ? 'Refreshing realms…'
                        : realms.isError
                          ? 'Try again'
                          : 'Refresh realms'}
                    </Button>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
              name="faction"
              render={({ field }) => (
                <FormItem className="auc-space-y-1">
                  <FormLabel>Faction</FormLabel>
                  {realms.isLoading ? (
                    <Skeleton className="auc-h-[40px]" />
                  ) : (
                    <FormControl>
                      <NativeSelect {...field} value={field.value || ''} disabled={!selectedRealm}>
                        <option value="" disabled>
                          Select faction
                        </option>
                        <option value="Alliance">Alliance</option>
                        <option value="Horde">Horde</option>
                      </NativeSelect>
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            className="auc-w-full"
            type="submit"
            disabled={
              !isVersionAvailable(watchVersion) ||
              !watchRegion ||
              !selectedHouse ||
              realms.isError ||
              realms.isLoading ||
              userMutation.isPending
            }
          >
            {userMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
          {userMutation.isError && (
            <p role="alert" className="auc-text-sm auc-text-red-600 dark:auc-text-red-400">
              Could not save your realm. Please try again.
            </p>
          )}
          {userMutation.isSuccess && (
            <p className="auc-text-green-500 dark:auc-text-green-400">Saved!</p>
          )}
        </div>
      </form>
    </Form>
  );
};

const root = document.getElementById('root');

if (root) {
  document.documentElement.dataset.view =
    new URLSearchParams(window.location.search).get('large') === 'true' ? 'tab' : 'popup';
  ReactDOM.createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <RealmForm />
      <ReactQueryDevtools />
    </QueryClientProvider>,
  );
}
