import 'styles/globals.css';

import * as i from 'types';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SearchIcon } from 'lucide-react';
import { sql } from 'drizzle-orm';

import { cn } from 'services/cn';
import { SITE_URL } from 'services/utils';
import { SizeIndicator } from 'common/SizeIndicator';
import { Input } from 'shadcn-ui/input';
import { Button } from 'shadcn-ui/button';
import { db } from 'db';
import { itemsMetadata } from 'db/schema';
import { RealmDropdown } from 'common/realm-dropdown';

import { Providers } from './Providers';

type Props = i.NextLayoutProps;

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Auctionoton',
    template: '%s | Auctionoton',
  },
  metadataBase: new URL(SITE_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
};

const RootLayout = (props: Props) => {
  async function search(formdata: FormData) {
    'use server';

    const search = formdata.get('search') as string;

    const results = await db
      .select({
        id: itemsMetadata.id,
        name: itemsMetadata.name,
        slug: itemsMetadata.slug,
        quality: itemsMetadata.quality,
      })
      .from(itemsMetadata)
      .where(sql`similarity(name, ${search}) > 0.3`)
      .orderBy(sql`similarity(name, ${search}) DESC`)
      .limit(10);

    console.log(results);

    return results;
  }

  return (
    <html lang="en" className="h-dvh bg-white antialiased">
      <body className={cn('h-full min-h-full', inter.className)}>
        <Providers>
          <div className="flex flex-col w-full min-h-screen">
            <header className="flex items-center h-16 px-4 border-b shrink-0 md:px-6 gap-4">
              <form className="flex-1 ml-4 md:ml-6" action={search}>
                <div className="relative w-full max-w-md flex gap-4">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <Input
                    className="pl-8"
                    placeholder="Search item..."
                    type="search"
                    name="search"
                  />
                  <Button type="submit" className="hidden md:flex">
                    Search
                  </Button>
                </div>
              </form>

              <div className="flex items-center gap-4">
                {/* <DropdownRadio
                  options={[
                    { label: 'EU', value: 'eu' },
                    { label: 'US', value: 'us' },
                  ]}
                  label="Region"
                /> */}
                <RealmDropdown />
              </div>
            </header>
            {props.children}
            {process.env.NODE_ENV !== 'production' && <SizeIndicator />}
          </div>
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
