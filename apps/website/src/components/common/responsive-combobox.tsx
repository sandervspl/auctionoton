'use client';

import * as React from 'react';

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
import { useRouter } from 'next/navigation';

type Props = {
  options: Option[];
};

type Option = { label: string; value: string };

export function ResponsiveComboBox(props: Props) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [selectedRealm, setSelectedRealm] = React.useState<Option | null>(null);

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start">
            {selectedRealm ? selectedRealm.label : 'Select realm'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <StatusList
            options={props.options}
            setOpen={setOpen}
            setSelectedRealm={setSelectedRealm}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-[150px] justify-start">
          {selectedRealm ? selectedRealm.label : 'Select ream'}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <StatusList
            options={props.options}
            setOpen={setOpen}
            setSelectedRealm={setSelectedRealm}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function StatusList(props: {
  setOpen: (open: boolean) => void;
  setSelectedRealm: (status: Option | null) => void;
  options: Option[];
}) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();

  return (
    <Command>
      <CommandInput placeholder="Search realm" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {props.options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              onSelect={(value) => {
                // props.setSelectedRealm(
                //   props.options.find((priority) => priority.value === value) || null,
                // );

                startTransition(() => {
                  props.setOpen(false);

                  console.log('go');

                  const [realm, region] = value.split('_');
                  router.push(`/${realm}/${region}/alliance/grime-encrusted-salvage`);
                });
              }}
            >
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
