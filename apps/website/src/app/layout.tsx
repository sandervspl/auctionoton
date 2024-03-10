import 'styles/globals.css';

import * as i from 'types';
import { Metadata } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { $path } from 'next-typesafe-url';

import { cn } from 'services/cn';
import { SITE_URL } from 'services/utils';
import { SizeIndicator } from 'common/SizeIndicator';
import { ItemSearchInput } from 'common/item-search-input';
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
  return (
    <html lang="en" className="h-dvh bg-white antialiased">
      <body className={cn('h-full min-h-full', inter.className)}>
        <Providers>
          <div className="flex flex-col w-full min-h-screen">
            <header className="relative flex justify-between h-16 px-4 border-b shrink-0 md:px-6 gap-4">
              <Link href={$path({ route: '/' })} className="self-center">
                <span className="hidden sm:block">Auctionoton</span>
                <span className="sm:hidden">A</span>
              </Link>
              <div className="absolute left-10 md:left-36 top-3 w-48 sm:w-full max-w-96 flex-grow flex-shrink">
                <ItemSearchInput />
              </div>
              <div className="ml-auto self-center">
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
