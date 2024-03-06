import 'styles/globals.css';

import * as i from 'types';
import * as React from 'react';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { cn } from 'services/cn';
import { SITE_URL } from 'services/utils';
import { SizeIndicator } from 'common/SizeIndicator';

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

const RootLayout: React.FC<Props> = ({ children }) => {
  return (
    <html lang="en" className="h-dvh bg-white antialiased">
      <body className={cn('h-full min-h-full', inter.className)}>
        <Providers>
          {children}
          {process.env.NODE_ENV !== 'production' && <SizeIndicator />}
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
