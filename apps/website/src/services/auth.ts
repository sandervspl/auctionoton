import { auth } from '@clerk/tanstack-react-start/server';
import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

export const requireUser = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await auth();
  if (!userId) {
    throw redirect({ to: '/', search: { error: 'unauthorized' } });
  }
  return { userId };
});
