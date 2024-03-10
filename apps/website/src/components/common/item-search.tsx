'use client';

import * as React from 'react';
import { Loader2Icon } from 'lucide-react';
import { $path } from 'next-typesafe-url';
import { useDebounce } from 'use-debounce';
import Image from 'next/image';
import Link from 'next/link';

import * as Combobox from 'park-ui/combobox';
import { Input } from 'park-ui/input';
import { useSettings } from 'hooks/use-settings';
import { useSearchQuery } from 'queries/search';
import { addRecentSearch } from 'actions/search';

export const ItemSearch = () => {
  // const [items, setItems] = React.useState(data);
  const { settings } = useSettings();
  const [inputValue, setValue] = React.useState('');
  const [value] = useDebounce(inputValue, 500);
  const searchQuery = useSearchQuery(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Combobox.Root
      onInputValueChange={(e) => {
        setValue(e.value);
      }}
      items={searchQuery.data ?? []}
      selectionBehavior="clear"
    >
      <Combobox.Control>
        <Combobox.Input placeholder="Search item" asChild>
          <Input ref={inputRef} />
        </Combobox.Input>
      </Combobox.Control>
      <Combobox.Positioner>
        <Combobox.Content>
          <>
            {searchQuery.data && searchQuery.data.length === 0 ? (
              <div className="p-2 flex items-center text-sm gap-2">No items found.</div>
            ) : !searchQuery.data && inputValue.length > 0 ? (
              <div className="p-2 flex items-center text-sm gap-2">
                <Loader2Icon className="animate-spin h-4 w-4" /> Searching...
              </div>
            ) : null}
          </>

          <Combobox.ItemGroup id="items">
            {searchQuery.data?.map((item) => (
              <Combobox.Item key={item.id} item={item.slug}>
                <Combobox.ItemText asChild>
                  <Link
                    href={$path({
                      route: '/item/[...item]',
                      routeParams: {
                        item: [settings.realm, settings.region, settings.faction, item.slug],
                      },
                    })}
                    className="flex items-center justify-start w-full gap-2 h-full"
                    onClick={() => {
                      setValue('');
                      inputRef.current?.blur();
                      addRecentSearch(inputValue, item.id);
                    }}
                  >
                    <Image
                      src={item.icon ?? '/images/questionmark.webp'}
                      alt={item.name}
                      className="h-6 w-6 rounded-md"
                      width={24}
                      height={24}
                    />
                    <span>{item.name}</span>
                  </Link>
                </Combobox.ItemText>
              </Combobox.Item>
            ))}
          </Combobox.ItemGroup>
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
};
