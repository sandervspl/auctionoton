import 'typed-query-selector';
import * as i from 'types';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, useMutation } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { SubmitHandler, useForm } from 'react-hook-form';

import {
  SelectValue,
  SelectTrigger,
  SelectItem,
  SelectContent,
  Select,
} from 'src/components/ui/select';
import { Button } from 'src/components/ui/button';
import useRealmsList from 'hooks/useRealmsList';
import useStorageQuery from 'hooks/useStorageQuery';
import asyncStorage from 'utils/asyncStorage';
import slugify from 'slugify';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'src/components/ui/form';

interface FormInput {
  region: i.Regions;
  realm: string;
  faction: i.Factions;
  version: i.Version;
}

// Create a client
const queryClient = new QueryClient();

export const RealmForm: React.FC = () => {
  const { data: user } = useStorageQuery('user');
  const userMutation = useMutation({ mutationFn: userMutateFn });
  const form = useForm<FormInput>({
    mode: 'all',
  });
  const watchRegion = form.watch('region');
  const watchVersion = form.watch('version');
  const watchRealm = form.watch('realm');
  const realms = useRealmsList(watchRegion, watchVersion);

  React.useLayoutEffect(() => {
    if (!user) {
      return;
    }

    const version = user.version;
    const realmSlug = version ? user.realms?.[version]?.slug : null;

    if (version && realmSlug) {
      form.reset({
        region: user.region,
        realm: user.realms?.[version]?.name,
        faction: user.realms?.[version] && realmSlug ? user.faction[realmSlug] : undefined,
        version: user.version,
      });
    }
  }, [form, user]);

  React.useEffect(() => {
    if (!realms.data) {
      return;
    }

    const storedRealm = watchVersion ? user?.realms?.[watchVersion]?.name : null;
    const firstRealmInlist = realms.data[0];

    if (
      storedRealm &&
      realms.data.find((realm) => realm.name.toLowerCase() === storedRealm.toLowerCase())
    ) {
      form.setValue('realm', storedRealm);
    } else if (firstRealmInlist) {
      form.setValue('realm', firstRealmInlist.name);
    }
  }, [user, realms.data, watchVersion, form]);

  React.useEffect(() => {
    if (!watchRealm) {
      return;
    }

    const faction = user?.faction[slugify(watchRealm)];
    form.setValue('faction', faction || 'Alliance');
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
      const realm = realms.data.find(
        (realm) => realm.name.toLowerCase() === data.realm.toLowerCase(),
      );
      if (!realm) {
        throw Error('Could not find realm');
      }

      const realmSlug = slugify(realm.name, {
        lower: true,
      });

      draft.region = data.region;
      draft.version = data.version;
      draft.realms ||= {};
      draft.realms[data.version] = {
        name: realm.name,
        slug: realmSlug,
      };

      draft.faction = {
        ...user?.faction,
        [realmSlug]: data.faction,
      };
    });
  }

  return (
    <Form {...form}>
      <form
        className="auc-mx-auto md:auc-max-w-md auc-space-y-6 auc-p-6 auc-w-full"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="auc-space-y-2 auc-text-center auc-gap-4 auc-flex auc-items-center md:auc-block">
          <img alt="Logo" src="static/icon.png" className="auc-mx-auto auc-hidden md:auc-block" />
          <img alt="Logo" src="static/icon-48.png" className="auc-block md:auc-hidden" />
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger id="version">
                        <SelectValue placeholder="Select game version" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="item-aligned">
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="era">Era</SelectItem>
                    </SelectContent>
                  </Select>
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
                <FormItem className="auc-space-y-1">
                  <FormLabel>Region</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger id="region">
                        <SelectValue placeholder="Select Region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="item-aligned">
                      <SelectItem value="eu">Europe</SelectItem>
                      <SelectItem value="us">North America</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger id="realm">
                        <SelectValue placeholder="Select realm" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="item-aligned">
                      {realms.data?.map((realm) => (
                        <SelectItem key={realm.realmId} value={realm.name}>
                          {realm.localizedName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger id="faction">
                        <SelectValue placeholder="Select faction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="item-aligned">
                      <SelectItem value="Alliance">Alliance</SelectItem>
                      <SelectItem value="Horde">Horde</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button className="auc-w-full" type="submit">
            Save
          </Button>
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
  ReactDOM.createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <RealmForm />
      <ReactQueryDevtools />
    </QueryClientProvider>,
  );
}
