import 'styles/globals.css';

import type * as i from 'types';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { cn } from 'services/cn';
import { SITE_URL } from 'services/utils';
import { SizeIndicator } from 'common/SizeIndicator';

import { Providers } from './Providers';
import { Navbar } from 'modules/navbar';

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
            <Navbar />
            {props.children}
            {process.env.NODE_ENV !== 'production' && <SizeIndicator />}
          </div>
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
