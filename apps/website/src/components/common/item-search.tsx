'use client';

import * as React from 'react';
import { Loader2Icon } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import * as Combobox from 'park-ui/combobox';
import { Input } from 'park-ui/input';

import { useSettings } from 'hooks/use-settings';
import { useSearchQuery } from 'queries/search';
import { getTextQualityColor } from 'services/colors';

import { ItemImage } from './item-image';
import { useRouter } from 'next/navigation';
import { addRecentSearch } from 'actions/search';

type Props = {
  autoFocus?: boolean;
  className?: string;
  onBlur?: () => void;
  searchItem?: (props: { item: SearchItem }) => React.ReactNode;
};

export type SearchItem = {
  id: number;
  name: string | null;
  slug: string | null;
  icon: string | null;
  quality: number | null;
};

export const ItemSearch = React.forwardRef((props: Props, ref) => {
  const [inputValue, setValue] = React.useState('');
  const [, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [value] = useDebounce(inputValue, 500);
  const searchQuery = useSearchQuery(value);
  const { settings } = useSettings();

  React.useImperativeHandle(
    ref,
    () => {
      return {
        focus() {
          inputRef.current?.focus();
        },
      };
    },
    [],
  );

  return (
    <Combobox.Root
      items={searchQuery.data ?? []}
      selectionBehavior="clear"
      className={props.className}
      onValueChange={(details) => {
        startTransition(async () => {
          const slug = details.value[0];
          const itemId = searchQuery.data?.find((item) => item.slug === slug)?.id;
          setValue('');
          inputRef.current?.blur();
          if (itemId) {
            await addRecentSearch(inputValue, itemId);
          }
          router.push(`/item/${settings.realm}/${settings.region}/${settings.faction}/${details.value[0]}`);
        })
      }}
    >
      <Combobox.Control>
        <Combobox.Input placeholder="Search item" asChild>
          <Input
            ref={inputRef}
            autoFocus={props.autoFocus}
            onBlur={props.onBlur}
            onChange={(e) => setValue(e.currentTarget.value)}
          />
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
                  {props.searchItem ? (
                    <props.searchItem item={item} />
                  ) : (
                    <div className="flex items-center justify-start w-full gap-2 h-full">
                      <ItemImage item={item} width={24} height={24} />
                      <span className="truncate" style={getTextQualityColor(item.quality)}>
                        {item.name}
                      </span>
                    </div>
                  )}
                </Combobox.ItemText>
              </Combobox.Item>
            ))}
          </Combobox.ItemGroup>
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
});
