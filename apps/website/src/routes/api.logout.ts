import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/logout')({
  server: {
    handlers: {
      POST: ({ request }) => {
        const url = new URL(request.url);
        if (request.headers.get('Origin') !== url.origin)
          return new Response('Forbidden', { status: 403 });
        // Access needs its cookie to revoke the session. Let its logout endpoint
        // clear that cookie; clearing it here makes Access report "No cookie".
        return Response.json(
          { logoutUrl: '/cdn-cgi/access/logout' },
          {
            headers: {
              'Cache-Control': 'private, no-store',
            },
          },
        );
      },
    },
  },
});
