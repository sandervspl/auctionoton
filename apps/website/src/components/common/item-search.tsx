import * as React from 'react';
import { LoaderCircleIcon, XIcon } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';

import { addRecentSearch, searchItem } from 'actions/search';
import { useAccessAuth } from 'common/access-auth';
import { useMediaQuery } from 'hooks/use-media-query';
import { useSettings } from 'hooks/use-settings';
import { getRecentSearches } from 'queries/search';
import { getTextQualityColor } from 'services/colors';
import { cn } from 'services/cn';
import { useSearchEngine } from 'services/item-search';
import { Button } from 'shadcn-ui/button';
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

/** Item matches for `query`: from the local index when it is ready, else from the server. */
export function useItemResults(query: string, limit?: number) {
  const search = useServerFn(searchItem);
  const engine = useSearchEngine();
  const useServer =
    engine.status === 'unavailable' || engine.status === 'loading' || engine.status === 'error';
  const [debounced] = useDebounce(query, FALLBACK_DEBOUNCE_MS);
  const fallback = useQuery({
    queryFn: () => search({ data: debounced }),
    enabled: useServer && debounced.length > 0,
    queryKey: ['search', debounced],
  });

  const items = React.useMemo((): SearchItem[] => {
    if (!query) return [];
    if (engine.status === 'ready')
      return engine.engine
        .search(query, limit)
        .map((hit) => ({ ...hit, icon: itemIconUrl(hit.icon) }));
    if (useServer) return fallback.data ?? [];
    return [];
  }, [query, limit, engine, useServer, fallback.data]);

  const searching =
    !!query &&
    items.length === 0 &&
    engine.status !== 'unsupported' &&
    (useServer ? fallback.isFetching || debounced !== query : false);

  return { engine, items, searching, failed: useServer && fallback.isError };
}

/** Saves a chosen result as a recent search for signed-in users. */
export function useRecordSearch() {
  const recordSearch = useServerFn(addRecentSearch);
  const queryClient = useQueryClient();
  return React.useCallback(
    (search: string, itemId: number) =>
      recordSearch({ data: { search, itemId } })
        .then(() => queryClient.invalidateQueries({ queryKey: ['recent-searches'] }))
        .catch(() => toast.error('Could not save your recent search')),
    [recordSearch, queryClient],
  );
}

export function ItemSearch(props: Props) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setValue] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // When we close the list, Ark moves focus back to the input on the next frame; that
  // focus must not reopen the search or bring a phone's keyboard back.
  const closedAt = React.useRef(0);
  const ref = React.useMemo(() => mergeRefs(inputRef, props.ref), [props.ref]);
  const navigate = useNavigate();
  const recordSearch = useRecordSearch();
  const loadRecent = useServerFn(getRecentSearches);
  const { settings } = useSettings();
  const { session } = useAccessAuth();
  const query = inputValue.trim();
  const results = useItemResults(query);
  const { engine } = results;
  // Phones get a full-screen search, opened by focusing the box. The dashboard's inline
  // "Add item" search keeps the dropdown.
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const fullscreen = !isDesktop && open && !props.onItemSelect;

  const recent = useQuery({
    queryFn: () => loadRecent(),
    enabled: open && !!session && !query,
    queryKey: ['recent-searches', settings.realm, settings.region, settings.faction],
  });

  const items = React.useMemo((): SearchItem[] => {
    if (query) return results.items;
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
  }, [query, results.items, recent.data]);

  useKeystrokeTiming(items);

  React.useEffect(() => {
    if (!fullscreen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [fullscreen]);

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
  const isOpen = fullscreen || (open && (query.length > 0 || showRecent));
  const showViewAll = query.length > 0 && items.length > 0 && !props.onItemSelect;

  function close() {
    closedAt.current = performance.now();
    setOpen(false);
    inputRef.current?.blur();
  }

  function viewAll() {
    const q = query;
    setValue('');
    close();
    void navigate({ to: '/search', search: { q } });
  }

  const status =
    engine.status === 'unsupported' && query ? (
      <div className="p-2 text-sm">Item search isn't available for {engine.versionLabel} yet.</div>
    ) : results.failed ? (
      <div className="p-2 text-sm" role="alert">
        Could not search items. Please try again.
      </div>
    ) : results.searching ? (
      <div className="p-2 flex items-center text-sm gap-2">
        <LoaderCircleIcon className="animate-spin size-4" /> Searching...
      </div>
    ) : query && items.length === 0 ? (
      <div className="p-2 flex items-center text-sm gap-2">No items found.</div>
    ) : fullscreen && items.length === 0 ? (
      <div className="p-2 text-sm text-muted-foreground">Type an item name to search.</div>
    ) : null;

  const list = (
    <>
      {status}
      {showRecent && (
        <div className="px-2 pt-1 pb-0.5 text-xs text-muted-foreground">Recent searches</div>
      )}
      <ComboboxItemGroup className={cn({ 'flex flex-col gap-1.5': fullscreen })}>
        {collection.items.map((item) => (
          <ComboboxItem
            key={item.id}
            item={item}
            className={cn(
              'px-2 h-11 shrink-0 leading-6 text-base touch-manipulation select-none',
              fullscreen && 'h-14 px-3 rounded-md border bg-card',
            )}
          >
            <ComboboxItemText asChild>
              <ItemResult item={item} iconSize={fullscreen ? 32 : 24} />
            </ComboboxItemText>
          </ComboboxItem>
        ))}
      </ComboboxItemGroup>
    </>
  );

  return (
    <Combobox
      collection={collection}
      selectionBehavior="clear"
      inputBehavior="autohighlight"
      className={cn(
        props.className,
        fullscreen && 'fixed inset-0 z-50 h-dvh max-w-none bg-background p-4 gap-3',
      )}
      open={isOpen}
      onOpenChange={(details) => {
        // The full-screen search closes only from its own button or by choosing a result.
        if (!fullscreen || details.open) setOpen(details.open);
      }}
      onValueChange={(details) => {
        const selected = items.find((item) => String(item.id) === details.value[0]);
        const typed = query || selected?.name || '';
        setValue('');
        if (!selected) return;
        // Close at once and drop focus so a phone's keyboard does not keep the list in view.
        close();

        if (props.onItemSelect) {
          props.onItemSelect(selected);
        } else {
          const itemId = selected.id;
          const slug = selected.slug;
          if (!slug) return;
          setPending(true);
          void recordSearch(typed, itemId);
          void navigate({
            to: '/item/$realmSlug/$region/$faction/$itemSlug',
            params: {
              realmSlug: settings.realm,
              region: settings.region,
              faction: settings.faction,
              itemSlug: `${slug}-${itemId}`,
            },
          })
            .catch(() => toast.error('Could not open this item'))
            .finally(() => setPending(false));
        }
      }}
    >
      <ComboboxControl>
        <ComboboxInput placeholder="Search item" asChild>
          <Input
            ref={ref}
            autoFocus={props.autoFocus}
            enterKeyHint="search"
            onFocus={(e) => {
              if (performance.now() - closedAt.current < 500) {
                e.currentTarget.blur();
                return;
              }
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
        {pending && (
          <LoaderCircleIcon
            aria-label="Opening item"
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin size-4 text-muted-foreground"
          />
        )}
      </ComboboxControl>
      {fullscreen ? (
        // Rendered in place of the floating dropdown. The buttons sit inside the content so
        // tapping them does not count as a tap outside the search.
        <ComboboxContent className="flex-1 min-h-0 gap-3 overflow-y-auto overscroll-contain border-0 bg-transparent shadow-none">
          {list}
          {showViewAll && (
            <Button className="w-full h-11 shrink-0" onClick={viewAll}>
              View all search results
            </Button>
          )}
          <Button variant="secondary" className="w-full h-11 shrink-0 gap-2" onClick={close}>
            <XIcon className="size-4" /> Close search
          </Button>
        </ComboboxContent>
      ) : (
        <ComboboxPositioner>
          <ComboboxContent
            className={cn(
              // Stay within the visible area and scroll inside.
              'max-h-[min(var(--available-height,24rem),24rem)] overflow-y-auto overscroll-contain',
              { 'p-1': items.length > 0 },
            )}
          >
            {list}
            {showViewAll && (
              <button
                type="button"
                className="mt-1 shrink-0 rounded-sm px-2 h-9 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={viewAll}
              >
                View all search results
              </button>
            )}
          </ComboboxContent>
        </ComboboxPositioner>
      )}
    </Combobox>
  );
}

/** One result row: icon, name in its quality color with matched text in bold, and item type. */
export function ItemResult({
  item,
  iconSize = 24,
  className,
  ...props
}: { item: SearchItem; iconSize?: number } & React.ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn('flex items-center justify-start w-full gap-2 h-full min-w-0', className)}
    >
      <ItemImage item={item} width={iconSize} height={iconSize} alt="" />
      <span className="truncate" style={getTextQualityColor(item.quality)}>
        <HighlightedName name={item.name ?? ''} ranges={item.highlights ?? []} />
      </span>
      {item.type ? (
        <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground">{item.type}</span>
      ) : null}
    </div>
  );
}

/** A result row that links to the item page and records the search. */
export function ItemResultLink({ item, query }: { item: SearchItem; query: string }) {
  const { settings } = useSettings();
  const recordSearch = useRecordSearch();
  if (!item.slug) return null;
  return (
    <Link
      to="/item/$realmSlug/$region/$faction/$itemSlug"
      params={{
        realmSlug: settings.realm,
        region: settings.region,
        faction: settings.faction,
        itemSlug: `${item.slug}-${item.id}`,
      }}
      onClick={() => void recordSearch(query, item.id)}
      className="flex h-14 items-center rounded-md border bg-card px-3 text-base hover:border-white/30"
    >
      <ItemResult item={item} iconSize={32} />
    </Link>
  );
}

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    }
  };
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
