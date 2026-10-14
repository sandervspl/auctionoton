import { createFileRoute } from '@tanstack/react-router';
import { getAccessSession } from 'services/access.server';

export const Route = createFileRoute('/api/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAccessSession(request);
        return Response.json(
          { session },
          {
            status: session ? 200 : 401,
            headers: { 'Cache-Control': 'private, no-store' },
          },
        );
      },
    },
  },
});
