import 'styles/globals.css';

import type * as i from 'types';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { $path } from 'next-typesafe-url';

import { cn } from 'services/cn';
import { SITE_URL } from 'services/utils';
import { SizeIndicator } from 'common/SizeIndicator';
import { RealmDropdown } from 'common/realm-dropdown';
import { ItemSearch } from 'common/item-search';

import { Providers } from './Providers';
import Script from 'next/script';

type Props = i.NextLayoutProps;

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Auctionoton',
    template: '%s · Auctionoton',
  },
  metadataBase: new URL(SITE_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
};

const RootLayout = (props: Props) => {
  return (
    <html lang="en" className="dark h-dvh min-h-full antialiased">
      <body className={cn('h-full min-h-full', inter.className)}>
        <Providers>
          <div className="flex flex-col w-full min-h-screen">
            <header className="relative h-16 px-4 border-b shrink-0 md:px-6 gap-4">
              <div className="flex items-center justify-between mx-auto w-full h-full max-w-screen-xl">
                <div className="flex items-center justify-start gap-4">
                  <Link href={$path({ route: '/' })} className="self-center">
                    <span className="hidden sm:block">Auctionoton</span>
                    <span className="sm:hidden">A</span>
                  </Link>
                  <div className="top-3 sm:w-full w-full flex-grow flex-shrink">
                    <ItemSearch />
                  </div>
                </div>
                <div className="ml-auto self-center">
                  <RealmDropdown />
                </div>
              </div>
              <Script
                src="http://umami-f4oc848.168.119.167.208.sslip.io/script.js"
                data-website-id="047847e3-ba46-4960-a0fd-9eae75c8ba96"
              />
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
