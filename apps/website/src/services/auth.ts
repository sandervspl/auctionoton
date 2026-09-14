import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getAccessSession } from './access.server';

export const getSession = createServerFn({ method: 'GET' }).handler(() => getAccessSession());

export const requireUser = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAccessSession();
  if (!session) {
    throw redirect({ to: '/', search: { error: 'unauthorized' } });
  }
  return { userId: session.userId };
});
