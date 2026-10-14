import '@fontsource-variable/inter';
import 'styles/globals.css';

import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { SizeIndicator } from 'common/SizeIndicator';
import { AccessProvider } from 'common/access-auth';
import { AuthSync } from 'common/auth-sync';
import { NotFound } from 'common/not-found';
import { RouteError } from 'common/route-error';
import { Navbar } from 'modules/navbar';
import type { ReactNode } from 'react';
import { getSession } from 'services/auth';
import { Toaster } from 'sonner';

export const Route = createRootRoute({
  beforeLoad: async () => ({ session: await getSession() }),
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
  const { session } = Route.useRouteContext();
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
        <AccessProvider initialSession={session ?? null}>
          <AuthSync />
          <div className="flex flex-col w-full min-h-screen">
            <Navbar />
            {children}
            {import.meta.env.DEV && <SizeIndicator />}
          </div>
          <Toaster richColors />
        </AccessProvider>
        <Scripts />
      </body>
    </html>
  );
}
