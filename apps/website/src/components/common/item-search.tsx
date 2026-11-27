import * as React from 'react';
import { LoaderCircleIcon } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';

import { addRecentSearch, searchItem } from 'actions/search';
import { useAccessAuth } from 'common/access-auth';
import { useSettings } from 'hooks/use-settings';
import { getRecentSearches } from 'queries/search';
import { getTextQualityColor } from 'services/colors';
import { cn } from 'services/cn';
import { useSearchEngine } from 'services/item-search';
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

import { itemIconUrl } from '../../../../cloudflare/src/item-icons';
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
  type?: string | null;
  highlights?: [number, number][];
};

// The fallback asks the server only while the index is unavailable; local search has no debounce.
const FALLBACK_DEBOUNCE_MS = 150;

export function ItemSearch(props: Props) {
  const [open, setOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<number>();
  const [inputValue, setValue] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const navigate = useNavigate();
  const search = useServerFn(searchItem);
  const recordSearch = useServerFn(addRecentSearch);
  const loadRecent = useServerFn(getRecentSearches);
  const { settings } = useSettings();
  const { session } = useAccessAuth();
  const engine = useSearchEngine();
  const query = inputValue.trim();

  const useServer =
    engine.status === 'unavailable' || engine.status === 'loading' || engine.status === 'error';
  const [debounced] = useDebounce(query, FALLBACK_DEBOUNCE_MS);
  const fallback = useQuery({
    queryFn: () => search({ data: debounced }),
    enabled: useServer && debounced.length > 0,
    queryKey: ['search', debounced],
  });
  const recent = useQuery({
    queryFn: () => loadRecent(),
    enabled: open && !!session && !query,
    queryKey: ['recent-searches', settings.realm, settings.region, settings.faction],
  });

  const items = React.useMemo((): SearchItem[] => {
    if (!query)
      return (recent.data ?? []).flatMap((row) =>
        row.name && row.slug
          ? [
              {
                id: row.itemId,
                name: row.name,
                slug: row.slug,
                icon: row.icon,
                quality: row.quality,
              },
            ]
          : [],
      );
    if (engine.status === 'ready')
      return engine.engine.search(query).map((hit) => ({ ...hit, icon: itemIconUrl(hit.icon) }));
    if (useServer) return fallback.data ?? [];
    return [];
  }, [query, recent.data, engine, useServer, fallback.data]);

  useKeystrokeTiming(items);

  const collection = React.useMemo(
    () =>
      createListCollection({
        items: items.map((item) => ({
          ...item,
          value: String(item.id),
          label: item.name ?? String(item.id),
        })),
      }),
    [items],
  );

  const showRecent = !query && items.length > 0;
  const isOpen = open && (query.length > 0 || showRecent || pending);
  const searching =
    !!query &&
    items.length === 0 &&
    engine.status !== 'unsupported' &&
    (useServer ? fallback.isFetching || debounced !== query : false);

  return (
    <Combobox
      collection={collection}
      selectionBehavior="clear"
      inputBehavior="autohighlight"
      className={props.className}
      open={isOpen}
      onOpenChange={(details) => setOpen(details.open)}
      closeOnSelect={false}
      onValueChange={(details) => {
        const selected = items.find((item) => String(item.id) === details.value[0]);
        const typed = query || selected?.name || '';
        setValue('');
        if (!selected) return;

        if (props.onItemSelect) {
          props.onItemSelect(selected);
        } else {
          const itemId = selected.id;
          const slug = selected.slug;
          setSelectedItem(itemId);
          if (!slug) return;
          setPending(true);
          void recordSearch({ data: { search: typed, itemId } })
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
            .finally(() => {
              setPending(false);
              setOpen(false);
            });
        }
      }}
    >
      <ComboboxControl>
        <ComboboxInput placeholder="Search item" asChild>
          <Input
            ref={props.ref}
            autoFocus={props.autoFocus}
            onFocus={() => {
              if (engine.status === 'loading' || engine.status === 'error') engine.load();
              setOpen(true);
            }}
            onBlur={props.onBlur}
            onChange={(e) => {
              keystrokeAt = performance.now();
              setOpen(true);
              setValue(e.currentTarget.value);
            }}
          />
        </ComboboxInput>
      </ComboboxControl>
      <ComboboxPositioner>
        <ComboboxContent className={cn({ 'p-1': items.length > 0 })}>
          {engine.status === 'unsupported' && query ? (
            <div className="p-2 text-sm">
              Item search isn't available for {engine.versionLabel} yet.
            </div>
          ) : useServer && fallback.isError ? (
            <div className="p-2 text-sm" role="alert">
              Could not search items. Please try again.
            </div>
          ) : searching ? (
            <div className="p-2 flex items-center text-sm gap-2">
              <LoaderCircleIcon className="animate-spin size-4" /> Searching...
            </div>
          ) : query && items.length === 0 ? (
            <div className="p-2 flex items-center text-sm gap-2">No items found.</div>
          ) : null}

          {showRecent && (
            <div className="px-2 pt-1 pb-0.5 text-xs text-muted-foreground">Recent searches</div>
          )}
          <ComboboxItemGroup>
            {collection.items.map((item) => (
              <ComboboxItem key={item.id} item={item} className="px-2 h-10 leading-6 text-base">
                <ComboboxItemText asChild>
                  <div className="flex items-center justify-start w-full gap-2 h-full min-w-0">
                    <ItemImage item={item} width={24} height={24} alt="" />
                    <span className="truncate" style={getTextQualityColor(item.quality)}>
                      <HighlightedName name={item.name ?? ''} ranges={item.highlights ?? []} />
                    </span>
                    {selectedItem === item.id && pending ? (
                      <LoaderCircleIcon className="ml-auto shrink-0 animate-spin size-5 text-white" />
                    ) : item.type ? (
                      <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground">
                        {item.type}
                      </span>
                    ) : null}
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

function HighlightedName({ name, ranges }: { name: string; ranges: [number, number][] }) {
  if (!ranges.length) return name;
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push(name.slice(at, start));
    parts.push(
      <mark key={start} className="bg-transparent text-inherit font-bold">
        {name.slice(start, end)}
      </mark>,
    );
    at = end;
  }
  if (at < name.length) parts.push(name.slice(at));
  return parts;
}

let keystrokeAt: number | undefined;
/** Development only: records keystroke-to-paint time as a `performance.measure` entry. */
function useKeystrokeTiming(results: unknown) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: measures each render of new results
  React.useEffect(() => {
    if (!import.meta.env.DEV || keystrokeAt === undefined) return;
    const start = keystrokeAt;
    keystrokeAt = undefined;
    requestAnimationFrame(() => {
      const measure = performance.measure('item-search keystroke to paint', {
        start,
        end: performance.now(),
      });
      console.debug(`item search: ${measure.duration.toFixed(1)} ms keystroke to paint`);
    });
  }, [results]);
}
