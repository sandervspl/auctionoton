import * as React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';

import { FactionButtons } from 'common/faction-buttons';
import { ItemSearch } from 'common/item-search';
import { Button } from 'shadcn-ui/button';
import { SearchIcon } from 'lucide-react';
import { getRecentSearches } from 'actions/search';

type Props = {
  params: Record<string, string>;
  searchParams: Record<string, string>;
};

export const metadata: Metadata = {
  title: 'Auctionoton',
};

export default async function Page(props: Props) {
  const recentSearches = await getRecentSearches();

  return (
    <main className="h-dvh">
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

        <div className="hidden sm:flex relative overflow-hidden rounded-lg bg-neutral-900 p-10">
          <Image
            src="/images/goblin_1.webp"
            alt="Goblin auctioneer art"
            className="object-cover"
            quality={90}
            priority
            // width={200}
            // height={200}
            fill
          />
        </div>
      </section>

      <section className="px-10">
        <h2 className="text-2xl font-bold">Recent Searches</h2>
        {recentSearches.map((search) => (
          <div key={search.id}>
            <Button variant="ghost" className="flex items-center gap-2">
              <Image
                src={search.icon ?? '/images/questionmark.webp'}
                alt={search.name!}
                className="h-6 w-6 rounded-md"
                width={24}
                height={24}
              />
              {search.name}
            </Button>
          </div>
        ))}
      </section>
    </main>
  );
}
