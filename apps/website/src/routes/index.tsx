import { createFileRoute } from '@tanstack/react-router';
import { FactionButtons } from 'common/faction-buttons';
import { ItemSearch } from 'common/item-search';
import { RecentSearchSection } from 'modules/home/recent-search-section';
import { ErrorToast } from 'modules/home/error-toast';
import { getRecentSearches } from 'queries/search';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  loader: () => getRecentSearches(),
  head: () => ({ meta: [{ title: 'Auctionoton' }] }),
  component: Home,
});

function Home() {
  const recentSearches = Route.useLoaderData();

  return (
    <main className="h-dvh space-y-8 sm:space-y-0">
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-10 px-10 pt-10 sm:pt-20 sm:h-[50%] max-w-screen-xl mx-auto">
        <div className="relative space-y-6 self-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Auctionoton</h1>
            <p>Auction House prices for all World of Warcraft classic realms</p>
          </div>
          <div className="space-y-2">
            <ItemSearch />
            <FactionButtons />
          </div>
        </div>
      </section>
      <RecentSearchSection recentSearches={recentSearches} />
      <ErrorToast />
    </main>
  );
}
