import '@tanstack/react-start/server-only';
import { getRequest } from '@tanstack/react-start/server';
import { safeReturnTo, verifyAccessSession } from './access-token';

export async function getAccessSession(request = getRequest()) {
  try {
    return await verifyAccessSession(request, {
      issuer: process.env.CLOUDFLARE_ACCESS_ISSUER || '',
      audience: process.env.CLOUDFLARE_ACCESS_AUD || '',
      googleAudience: process.env.CLOUDFLARE_ACCESS_GOOGLE_AUD,
      userIdMap: process.env.CLOUDFLARE_ACCESS_USER_ID_MAP,
    });
  } catch {
    throw new Response('Sign-in is temporarily unavailable. Please try again.', {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '30' },
    });
  }
}

/**
 * For server functions: their results are serialized to the client, which cannot carry a
 * Response, so an Access outage is rethrown as an Error the route error boundary can show.
 */
export async function getAccessSessionForServerFn() {
  try {
    return await getAccessSession();
  } catch (error) {
    if (error instanceof Response) throw new Error(await error.text());
    throw error;
  }
}

export async function completeAccessLogin(request: Request) {
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
}
