import { clerkMiddleware } from '@clerk/tanstack-react-start/server';
import { createMiddleware, createStart } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';

const responseHeaders = createMiddleware().server(async ({ next }) => {
  setResponseHeader('X-Accel-Buffering', 'no');
  // Pages and RPC responses can contain the current user's dashboard and searches.
  setResponseHeader('Cache-Control', 'private, no-store');
  const result = await next();
  result.response.headers.set('X-Accel-Buffering', 'no');
  result.response.headers.set('Cache-Control', 'private, no-store');
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [responseHeaders, clerkMiddleware()],
}));
