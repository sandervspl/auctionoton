import * as React from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { CheckIcon, LoaderCircleIcon } from 'lucide-react';

import { setAuctionHouseIdCookie } from 'actions/cookie';
import { useSettings } from 'hooks/use-settings';
import { useServerMutation } from 'hooks/use-server-mutation';
import { Button } from 'shadcn-ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from 'shadcn-ui/command';
import { Popover, PopoverContent, PopoverTrigger } from 'shadcn-ui/popover';
import { realmGroups, realmLabel, versionLabels } from 'services/realms';

export function useRealmLabel() {
  const { settings } = useSettings();
  return realmLabel(settings.realm, settings.region);
}

/** Desktop navbar realm picker; the mobile menu renders `RealmList` inline instead. */
export function RealmDropdown() {
  const [open, setOpen] = React.useState(false);
  const label = useRealmLabel();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[220px] justify-start" title={label}>
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="end">
        <RealmList onSelect={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

export function RealmList(props: { onSelect: () => void }) {
  const { setSettings, settings } = useSettings();
  const [selected, setSelected] = React.useState<string>();
  const [isNavigating, setNavigating] = React.useState(false);
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const setAuctionHouseCookie = useServerMutation(setAuctionHouseIdCookie);

  const isPending = isNavigating || setAuctionHouseCookie.isPending;
  const current = `${settings.realm}_${settings.region}`;

  async function onRealmSelect(value: string) {
    setSelected(value);
    setNavigating(true);
    try {
      props.onSelect();
      const [realm, region] = value.split('_');
      if (realm && (region === 'eu' || region === 'us')) {
        const activeFaction = params.faction ?? settings.faction;
        const faction = activeFaction === 'horde' ? 'horde' : 'alliance';
        setSettings({ realm, region, faction });
        await setAuctionHouseCookie.mutateAsync({ region, realmSlug: realm, faction });
        if (params.itemSlug) {
          await navigate({
            to: '/item/$realmSlug/$region/$faction/$itemSlug',
            params: { realmSlug: realm, region, faction, itemSlug: params.itemSlug },
          });
        }
      }
    } catch {
      // The mutation hook reports request failures to the user.
    } finally {
      setNavigating(false);
      setSelected(undefined);
    }
  }

  return (
    <Command defaultValue={current}>
      <CommandInput placeholder="Search realm or version" />
      <CommandList className="max-h-[360px]">
        <CommandEmpty>No realm found.</CommandEmpty>
        {realmGroups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.realms.map((realm) => {
              const value = `${realm.slug}_${realm.region}`;
              return (
                <CommandItem
                  key={value}
                  value={value}
                  keywords={[realm.name, versionLabels[realm.version], realm.region]}
                  className="flex items-center justify-between gap-2"
                  onSelect={onRealmSelect}
                >
                  {realm.name}
                  {isPending && selected === value ? (
                    <LoaderCircleIcon className="animate-spin" size={16} />
                  ) : (
                    value === current && <CheckIcon size={16} aria-label="Current realm" />
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}
