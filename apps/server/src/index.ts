import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { Elysia, t } from 'elysia';

import { getItemFromId } from './item';
import { checkRateLimit, errorHeaders, successHeaders } from './utils';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  prefix: 'auctionoton:item',
});

const app = new Elysia()
  .get(
    '/item/:id/ah/:ah_id',
    async ({ params: { id, ah_id }, request, set }) => {
      try {
        await checkRateLimit(ratelimit, request);
      } catch (response: any) {
        const { remaining, reset, limit } = response as {
          remaining: number;
          reset: number;
          limit: number;
          pending: number;
        };

        set.status = 429;
        set.headers = {
          ...errorHeaders,
          'content-type': 'text/plain',
          'ratelimit-limit': limit.toString(),
          'ratelimit-remaining': remaining.toString(),
          'ratelimit-reset': reset.toString(),
        };

        return 'Too many requests';
      }

      const item = await getItemFromId(id, ah_id);

      if ('error' in item) {
        set.status = 404;
        set.headers = errorHeaders;
        return item;
      }

      set.status = 200;
      set.headers = successHeaders;
      return item;
    },
    {
      params: t.Object({
        id: t.Numeric(),
        ah_id: t.Numeric(),
      }),
    },
  )
  .listen(3000);

console.log(`Auctionoton Server is running at ${app.server?.hostname}:${app.server?.port}`);
