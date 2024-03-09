'use client';

import * as React from 'react';
import { useDebounce } from 'use-debounce';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { $path } from 'next-typesafe-url';

import { ItemParam } from 'src/app/item/[...item]/page';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from 'shadcn-ui/command';
import { cn } from 'services/cn';
import { useSearchQuery } from 'queries/search';
import { Loader2Icon } from 'lucide-react';

export const ItemSearchInput = () => {
  const params = useParams() as { item: ItemParam };
  const [realmSlug, region, faction] = params.item;
  const router = useRouter();
  const [inputValue, setValue] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);
  const [value] = useDebounce(inputValue, 500);
  const searchQuery = useSearchQuery(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isResultsOpen = isFocused && inputValue;

  function getItemUrl(slug: string) {
    return `/item/${realmSlug}/${region}/${faction}/${slug}`;
  }

  return (
    <Command
      className={cn('rounded-lg border relative z-10', {
        'shadow-md': isResultsOpen,
      })}
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Search item"
        value={inputValue}
        onValueChange={(value) => {
          setValue(value);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setTimeout(() => {
            setIsFocused(false);
          }, 100);
        }}
        className="py-2 h-10"
        ref={inputRef}
      />
      <CommandList>
        {isResultsOpen && (
          <>
            {searchQuery.data && searchQuery.data.length === 0 ? (
              <div className="p-2 flex items-center text-sm gap-2">No items found.</div>
            ) : !searchQuery.data ? (
              <div className="p-2 flex items-center text-sm gap-2">
                <Loader2Icon className="animate-spin h-4 w-4" /> Searching...
              </div>
            ) : null}

            <CommandGroup
              className={cn({ 'p-0': searchQuery.data == null || searchQuery.data.length === 0 })}
            >
              {searchQuery.data?.map((result) => (
                <CommandItem
                  key={result.id}
                  asChild
                  onSelect={() => {
                    router.push(
                      $path({
                        route: '/item/[...item]',
                        routeParams: { item: [realmSlug, region, faction, result.slug] },
                      }),
                    );

                    inputRef.current?.blur();
                    setValue('');
                  }}
                >
                  <Link
                    href={$path({
                      route: '/item/[...item]',
                      routeParams: { item: [realmSlug, region, faction, result.slug] },
                    })}
                    className="flex items-center justify-start w-full gap-2"
                    onClick={() => {
                      setValue('');
                    }}
                  >
                    <Image
                      src={result.icon}
                      alt={result.name}
                      className="h-6 w-6 rounded-md"
                      width={24}
                      height={24}
                    />
                    <span>{result.name}</span>
                  </Link>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
};
