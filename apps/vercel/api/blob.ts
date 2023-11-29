import { put } from '@vercel/blob';

import { rateLimit } from './_rate-limiter.js';
import { getQueries } from './_utils.js';

const MAX_REQUESTS = 1;
const WINDOW_SECONDS = 60 * 60;

export async function POST(req: Request) {
  const isAllowed = await rateLimit('ahdb-upload', MAX_REQUESTS, WINDOW_SECONDS);

  if (!isAllowed) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'content-type': 'text/plain',
        'cache-control': 'no-store',
        'ratelimit-limit': MAX_REQUESTS.toString(),
        // 'ratelimit-remaining': '0',
        // 'ratelimit-reset': WINDOW_SECONDS.toString(),
      },
    });
  }

  try {
    const form = await req.formData();
    const file = form.get('file') as unknown as File;
    const realms = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 3600,
    });

    return new Response(JSON.stringify(realms), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=10800, s-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error: any) {
    return new Response(error.message, {
      status: 500,
      headers: {
        'content-type': 'text/plain',
        'cache-control': 'no-store',
      },
    });
  }
}

export async function GET(req: Request) {
  try {
    const query = getQueries(req.url);
    const name = query.get('name') || 'AuctionDB.lua';
    const fileUrl = `${process.env.BLOB_URL}/${name}`;

    // Redirect to file URL
    return new Response(null, {
      status: 302,
      headers: {
        location: fileUrl,
        'cache-control': 'no-store',
      },
    });
  } catch (error: any) {
    return new Response(error.message, {
      status: 500,
      headers: {
        'content-type': 'text/plain',
        'cache-control': 'no-store',
      },
    });
  }
}
