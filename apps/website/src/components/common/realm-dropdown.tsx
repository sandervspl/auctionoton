'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { $path } from 'next-typesafe-url';

import { useMediaQuery } from 'hooks/use-media-query';
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
import { ItemParam } from 'src/app/item/[...item]/page';

export function RealmDropdown() {
  const params = useParams() as { item: ItemParam };
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start capitalize">
            {params.item[0]?.replaceAll('-', ' ')} ({params.item[1]?.toUpperCase()})
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <RealmList setOpen={setOpen} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
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
  const router = useRouter();
  const params = useParams() as { item: ItemParam };
  const [, startTransition] = React.useTransition();

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
              onSelect={(value) => {
                startTransition(() => {
                  props.setOpen(false);
                  const [realm, region] = value.split('_');
                  router.push(
                    $path({
                      route: '/item/[...item]',
                      routeParams: { item: [realm!, region!, params.item[2], params.item[3]] },
                    }),
                  );
                });
              }}
            >
              {realm.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
