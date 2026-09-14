import { createFileRoute } from '@tanstack/react-router';
import { completeAccessLogin } from 'services/access.server';

export const Route = createFileRoute('/auth/login')({
  server: {
    handlers: {
      GET: ({ request }) => completeAccessLogin(request),
    },
  },
});
