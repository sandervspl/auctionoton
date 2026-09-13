import '@fontsource-variable/inter';
import 'styles/globals.css';

import { ClerkProvider } from '@clerk/tanstack-react-start';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Navbar } from 'modules/navbar';
import { SizeIndicator } from 'common/SizeIndicator';
import { NotFound } from 'common/not-found';
import { AuthSync } from 'common/auth-sync';
import { RouteError } from 'common/route-error';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Auctionoton' },
      {
        name: 'description',
        content: 'Auction House prices for all World of Warcraft classic realms',
      },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'icon', type: 'image/png', href: '/icon.png' },
    ],
  }),
  component: Outlet,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark h-dvh min-h-full antialiased">
      <head>
        <HeadContent />
        <script
          defer
          src="https://plausible.sandervspl.dev/js/script.js"
          data-domain="auctionoton.sandervspl.dev"
        />
      </head>
      <body className="h-full min-h-full" style={{ fontFamily: 'Inter Variable, sans-serif' }}>
        <ClerkProvider>
          <AuthSync />
          <div className="flex flex-col w-full min-h-screen">
            <Navbar />
            {children}
            {import.meta.env.DEV && <SizeIndicator />}
          </div>
          <Toaster richColors />
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}
