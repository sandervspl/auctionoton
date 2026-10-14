import * as React from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Loader2Icon } from 'lucide-react';

import { setAuctionHouseIdCookie } from 'actions/cookie';
import { useMediaQuery } from 'hooks/use-media-query';
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
import { Drawer, DrawerContent, DrawerTrigger } from 'shadcn-ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from 'shadcn-ui/popover';
import { realmDropdownValues } from 'services/realms';

type Props = {
  onOpen?: () => void;
};

export function RealmDropdown({ onOpen }: Props) {
  const { settings } = useSettings();
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  function onOpenChange(isOpen: boolean) {
    onOpen?.();
    setOpen(isOpen);
  }

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start capitalize">
            {settings.realm.replaceAll('-', ' ')} ({settings.region.toUpperCase()})
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="end">
          <RealmList setOpen={setOpen} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="justify-start">
          Realm
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <RealmList setOpen={setOpen} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function RealmList(props: { setOpen: (open: boolean) => void }) {
  const { setSettings, settings } = useSettings();
  const [selected, setSelected] = React.useState<string>();
  const [isNavigating, setNavigating] = React.useState(false);
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const setAuctionHouseCookie = useServerMutation(setAuctionHouseIdCookie);

  const isPending = isNavigating || setAuctionHouseCookie.isPending;

  return (
    <Command>
      <CommandInput placeholder="Search realm" />
      <CommandList>
        <CommandEmpty>No realm found.</CommandEmpty>
        <CommandGroup>
          {realmDropdownValues.map((realm) => (
            <CommandItem
              key={realm.value}
              value={realm.value}
              className="flex items-center justify-between gap-2"
              onSelect={async (value) => {
                setSelected(value);
                setNavigating(true);
                try {
                  props.setOpen(false);
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
              }}
            >
              {realm.label}
              {isPending && selected === realm.value && (
                <Loader2Icon className="animate-spin" size={16} />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
