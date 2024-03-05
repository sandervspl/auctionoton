import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

import { itemService } from './api/item';
import { checkRateLimit, errorHeaders, successHeaders } from './utils';
import { realmService } from './api/realms';

const version = await Bun.file('package.json')
  .json()
  .then((pkg) => pkg.version);

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  prefix: 'auctionoton:item',
});

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Auctionoton API',
          version,
          description: 'API documentation for Auctionoton',
        },
        servers: [
          {
            url: 'https://auctionoton-api.sandervspl.dev',
            description: 'Production',
          },
        ],
      },
      version,
    }),
  )
  .onRequest(async ({ request, set }) => {
    const result = await checkRateLimit(ratelimit, request);

    if (result) {
      set.status = 429;
      set.headers = {
        ...errorHeaders,
        'content-type': 'text/plain',
        'ratelimit-limit': result.limit.toString(),
        'ratelimit-remaining': result.remaining.toString(),
        'ratelimit-reset': result.reset.toString(),
      };

      return 'Too many requests';
    }
  })
  .get(
    '/health',
    async () => {
      return 'OK';
    },
    {
      detail: {
        summary: 'Health Check',
        tags: ['System'],
      },
    },
  )
  .get(
    '/realms/:region/:version',
    async ({ request, set, params: { region, version } }) => {
      const realms = await realmService(request, region, version);

      if ('error' in realms) {
        set.status = realms.status;
        set.headers = errorHeaders;
        return realms.message;
      }

      return realms;
    },
    {
      params: t.Object({
        region: t.String(),
        version: t.String(),
      }),
      detail: {
        summary: 'Get Realms',
        tags: ['Realms'],
      },
    },
  )
  .get(
    '/item/:id/ah/:ah_id',
    async ({ params: { id, ah_id }, set }) => {
      const item = await itemService(id, ah_id);

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
      detail: {
        summary: 'Get Item',
        tags: ['Items'],
      },
    },
  )
  .listen(3000);

console.log(`Auctionoton Server is running at ${app.server?.hostname}:${app.server?.port}`);
