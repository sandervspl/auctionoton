import { createFileRoute } from '@tanstack/react-router';
import { LoaderCircleIcon } from 'lucide-react';

import { ItemResultLink, useItemResults } from 'common/item-search';

// The dropdown shows the top ten; this page shows everything the local index ranks.
const ALL_RESULTS_LIMIT = 200;

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>): { q: string } => ({
    q: typeof search.q === 'string' ? search.q.slice(0, 200) : '',
  }),
  head: ({ match }) => ({
    meta: [{ title: match.search.q ? `${match.search.q} - Auctionoton` : 'Search - Auctionoton' }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const query = q.trim();
  const { engine, items, searching, failed } = useItemResults(query, ALL_RESULTS_LIMIT);

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-md) px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold">
        {query ? (
          <>
            Results for “{query}”
            {items.length > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                {items.length === ALL_RESULTS_LIMIT ? `${items.length}+` : items.length}
              </span>
            )}
          </>
        ) : (
          'Search items'
        )}
      </h1>

      {engine.status === 'unsupported' && query ? (
        <p className="text-sm">Item search isn't available for {engine.versionLabel} yet.</p>
      ) : failed ? (
        <p className="text-sm" role="alert">
          Could not search items. Please try again.
        </p>
      ) : searching || (query && engine.status === 'loading' && items.length === 0) ? (
        <p className="flex items-center gap-2 text-sm">
          <LoaderCircleIcon className="animate-spin size-4" /> Searching...
        </p>
      ) : query && items.length === 0 ? (
        <p className="text-sm">No items found.</p>
      ) : null}

      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <ItemResultLink item={item} query={query} />
          </li>
        ))}
      </ul>
    </main>
  );
}
