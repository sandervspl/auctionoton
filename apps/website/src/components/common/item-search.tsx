import * as React from 'react';
import { Loader2Icon } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import * as Combobox from 'park-ui/combobox';
import { Input } from 'park-ui/input';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';

import { addRecentSearch, searchItem } from 'actions/search';
import { useSettings } from 'hooks/use-settings';
import { getTextQualityColor } from 'services/colors';
import { cn } from 'services/cn';

import { ItemImage } from './item-image';

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
  const [open, setOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<number>();
  const [inputValue, setValue] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const search = useServerFn(searchItem);
  const recordSearch = useServerFn(addRecentSearch);
  const [value] = useDebounce(inputValue, 500);
  const searchQuery = useQuery({
    queryFn: () => search({ data: value }),
    enabled: value.trim().length > 0,
    queryKey: ['search', value],
  });
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

  if (!pending && open && !inputValue) {
    setOpen(false);
  }

  const collectionItems = React.useMemo(
    () =>
      (searchQuery.data ?? []).map((item) => ({
        ...item,
        value: String(item.id),
        label: item.name ?? String(item.id),
      })),
    [searchQuery.data],
  );

  return (
    <Combobox.Root
      items={collectionItems}
      selectionBehavior="clear"
      className={props.className}
      open={open}
      closeOnSelect={false}
      onValueChange={(details) => {
        setValue('');

        // If we have a custom item component we don't want to use the default action
        if (!props.searchItem) {
          const selected = searchQuery.data?.find((item) => String(item.id) === details.value[0]);
          const itemId = selected?.id;
          const slug = selected?.slug;

          if (itemId) {
            setSelectedItem(itemId);
          }

          if (!itemId || !slug) return;
          setPending(true);
          void recordSearch({ data: { search: inputValue, itemId } })
            .catch(() => toast.error('Could not save your recent search'))
            .then(() =>
              navigate({
                to: '/item/$realmSlug/$region/$faction/$itemSlug',
                params: {
                  realmSlug: settings.realm,
                  region: settings.region,
                  faction: settings.faction,
                  itemSlug: `${slug}-${itemId}`,
                },
              }),
            )
            .catch(() => toast.error('Could not open this item'))
            .finally(() => setPending(false));
        }
      }}
    >
      <Combobox.Control>
        <Combobox.Input placeholder="Search item" asChild>
          <Input
            ref={inputRef}
            autoFocus={props.autoFocus}
            onBlur={props.onBlur}
            onChange={(e) => {
              if (e.currentTarget.value.length > 0 && !open) {
                setOpen(true);
              }
              setValue(e.currentTarget.value);
            }}
          />
        </Combobox.Input>
      </Combobox.Control>
      <Combobox.Positioner>
        <Combobox.Content className={cn({ 'p-1': !!searchQuery.data })}>
          {searchQuery.isError ? (
            <div className="p-2 text-sm" role="alert">
              Could not search items. Please try again.
            </div>
          ) : searchQuery.data && searchQuery.data.length === 0 ? (
            <div className="p-2 flex items-center text-sm gap-2">No items found.</div>
          ) : !searchQuery.data && inputValue.length > 0 ? (
            <div className="p-2 flex items-center text-sm gap-2">
              <Loader2Icon className="animate-spin size-4" /> Searching...
            </div>
          ) : null}

          <Combobox.ItemGroup id="items">
            {collectionItems.map((item) => (
              <Combobox.Item key={item.id} item={item} className="px-2 h-10 leading-6 text-base">
                <Combobox.ItemText asChild>
                  {props.searchItem ? (
                    <props.searchItem item={item} />
                  ) : (
                    <div className="flex items-center justify-start w-full gap-2 h-full">
                      <ItemImage item={item} width={24} height={24} />
                      <div
                        className="truncate flex items-center justify-between w-full"
                        style={getTextQualityColor(item.quality)}
                      >
                        {item.name}
                        {selectedItem === item.id && pending && (
                          <Loader2Icon className="animate-spin size-5 text-white" />
                        )}
                      </div>
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
