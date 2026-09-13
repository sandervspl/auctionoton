import '@tanstack/react-start/server-only';
import { getRequest } from '@tanstack/react-start/server';
import { verifyAccessSession } from './access-token';

export async function getAccessSession(request = getRequest()) {
  try {
    return await verifyAccessSession(request, {
      issuer: process.env.CLOUDFLARE_ACCESS_ISSUER || '',
      audience: process.env.CLOUDFLARE_ACCESS_AUD || '',
      userIdMap: process.env.CLOUDFLARE_ACCESS_USER_ID_MAP,
    });
  } catch {
    throw new Response('Sign-in is temporarily unavailable. Please try again.', {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '30' },
    });
  }
}
