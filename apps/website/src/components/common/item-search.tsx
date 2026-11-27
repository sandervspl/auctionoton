import * as React from 'react';
import { LoaderCircleIcon } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';

import { addRecentSearch, searchItem } from 'actions/search';
import { useSettings } from 'hooks/use-settings';
import { getTextQualityColor } from 'services/colors';
import { cn } from 'services/cn';
import {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemGroup,
  ComboboxItemText,
  ComboboxPositioner,
  createListCollection,
} from 'shadcn-ui/combobox';
import { Input } from 'shadcn-ui/input';

import { ItemImage } from './item-image';

type Props = {
  ref?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
  className?: string;
  onBlur?: () => void;
  /** Replaces the default "open the item page" action when a result is chosen. */
  onItemSelect?: (item: SearchItem) => void;
};

export type SearchItem = {
  id: number;
  name: string | null;
  slug: string | null;
  icon: string | null;
  quality: number | null;
};

export function ItemSearch(props: Props) {
  const [open, setOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<number>();
  const [inputValue, setValue] = React.useState('');
  const [pending, setPending] = React.useState(false);
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

  if (!pending && open && !inputValue) {
    setOpen(false);
  }

  const collection = React.useMemo(
    () =>
      createListCollection({
        items: (searchQuery.data ?? []).map((item) => ({
          ...item,
          value: String(item.id),
          label: item.name ?? String(item.id),
        })),
      }),
    [searchQuery.data],
  );

  return (
    <Combobox
      collection={collection}
      selectionBehavior="clear"
      className={props.className}
      open={open}
      closeOnSelect={false}
      onValueChange={(details) => {
        setValue('');
        const selected = searchQuery.data?.find((item) => String(item.id) === details.value[0]);
        if (!selected) return;

        if (props.onItemSelect) {
          props.onItemSelect(selected);
        } else {
          const itemId = selected.id;
          const slug = selected.slug;
          setSelectedItem(itemId);
          if (!slug) return;
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
      <ComboboxControl>
        <ComboboxInput placeholder="Search item" asChild>
          <Input
            ref={props.ref}
            autoFocus={props.autoFocus}
            onBlur={props.onBlur}
            onChange={(e) => {
              if (e.currentTarget.value.length > 0 && !open) {
                setOpen(true);
              }
              setValue(e.currentTarget.value);
            }}
          />
        </ComboboxInput>
      </ComboboxControl>
      <ComboboxPositioner>
        <ComboboxContent className={cn({ 'p-1': !!searchQuery.data })}>
          {searchQuery.isError ? (
            <div className="p-2 text-sm" role="alert">
              Could not search items. Please try again.
            </div>
          ) : searchQuery.data && searchQuery.data.length === 0 ? (
            <div className="p-2 flex items-center text-sm gap-2">No items found.</div>
          ) : !searchQuery.data && inputValue.length > 0 ? (
            <div className="p-2 flex items-center text-sm gap-2">
              <LoaderCircleIcon className="animate-spin size-4" /> Searching...
            </div>
          ) : null}

          <ComboboxItemGroup>
            {collection.items.map((item) => (
              <ComboboxItem key={item.id} item={item} className="px-2 h-10 leading-6 text-base">
                <ComboboxItemText asChild>
                  <div className="flex items-center justify-start w-full gap-2 h-full">
                    <ItemImage item={item} width={24} height={24} alt="" />
                    <div
                      className="truncate flex items-center justify-between w-full"
                      style={getTextQualityColor(item.quality)}
                    >
                      {item.name}
                      {selectedItem === item.id && pending && (
                        <LoaderCircleIcon className="animate-spin size-5 text-white" />
                      )}
                    </div>
                  </div>
                </ComboboxItemText>
              </ComboboxItem>
            ))}
          </ComboboxItemGroup>
        </ComboboxContent>
      </ComboboxPositioner>
    </Combobox>
  );
}
