import { kv } from '@vercel/kv';

export async function rateLimit(identifier: string, maxRequests: number, windowSeconds: number) {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const key = `rate-limit:${identifier}`;
  const currentTime = Math.floor(new Date().getTime() / 1000);
  const windowEnd = currentTime - windowSeconds;

  // Remove older timestamps to keep the set small
  // @ts-expect-error -inf is valid
  await kv.zremrangebyscore(key, '-inf', windowEnd);

  // Count the number of requests in the specified time window
  const requestCount = await kv.zcard(key);

  if (requestCount < maxRequests) {
    // Add the current timestamp to the set
    await kv.zadd(key, { score: currentTime, member: currentTime.toString() });
    return true; // Request allowed
  } else {
    return false; // Request limit exceeded
  }
}
