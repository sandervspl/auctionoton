import { createFileRoute } from '@tanstack/react-router';
import { completeAccessLogin } from 'services/access.server';

export const Route = createFileRoute('/auth/google')({
  server: {
    handlers: {
      GET: ({ request }) => completeAccessLogin(request),
    },
  },
});
