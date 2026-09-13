import { createFileRoute } from '@tanstack/react-router';
import { safeReturnTo } from 'services/access-token';
import { getAccessSession } from 'services/access.server';

export const Route = createFileRoute('/auth/login')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAccessSession(request);
        if (!session)
          return new Response('Sign in through Cloudflare Access to continue.', {
            status: 401,
            headers: { 'Cache-Control': 'private, no-store' },
          });
        return new Response(null, {
          status: 303,
          headers: {
            Location: safeReturnTo(new URL(request.url).searchParams.get('returnTo')),
            'Cache-Control': 'private, no-store',
          },
        });
      },
    },
  },
});
