import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getAccessSessionForServerFn } from './access.server';

export const getSession = createServerFn({ method: 'GET' }).handler(() =>
  getAccessSessionForServerFn(),
);

export const requireUser = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAccessSessionForServerFn();
  if (!session) {
    throw redirect({ to: '/', search: { error: 'unauthorized' } });
  }
  return { userId: session.userId };
});
