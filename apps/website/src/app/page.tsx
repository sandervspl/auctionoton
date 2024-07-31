import * as React from 'react';
import type { Metadata } from 'next';

import { FactionButtons } from 'common/faction-buttons';
import { ItemSearch } from 'common/item-search';
import { RecentSearchSection, RecentSearchSectionLoader } from 'modules/home/recent-search-section';
import { ErrorToast } from 'modules/home/error-toast';

type Props = {
  params: Record<string, string>;
  searchParams: Record<string, string>;
};

export const metadata: Metadata = {
  title: 'Auctionoton',
};

export const revalidate = 60;

export default async function Page(props: Props) {
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

      <React.Suspense fallback={<RecentSearchSectionLoader />}>
        <RecentSearchSection />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <ErrorToast />
      </React.Suspense>
    </main>
  );
}
