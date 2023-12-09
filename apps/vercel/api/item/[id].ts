import { kv } from '@vercel/kv';
import { ipAddress, RequestContext } from '@vercel/edge';
import { and, eq, sql } from 'drizzle-orm';
import * as R from 'remeda';

import type { NexusHub } from '../_types.js';
import { getQueries, getURLParam, nexushubToItemResponse, qualityMap } from '../_utils.js';
import { rateLimit } from '../_rate-limiter.js';
import { getAuctionHouse } from '../_tsm.js';
import { db } from '../../db/index.js';
import { items, itemsMetadata } from '../../db/schema.js';
import { getItemFromBnet } from '../_blizzard/index.ts.js';
import slugify from '@sindresorhus/slugify';
import { GameItem } from '../_blizzard/types.js';

export const config = {
  runtime: 'edge',
};

const CACHE_EXPIRATION = 60 * 60 * 6;
const MAX_REQUESTS = 100;
const WINDOW_SECONDS = 60;
const headers = {
  'Content-Type': 'application/json',
  'cache-control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate',
  'Access-Control-Allow-Origin': '*',
};

const prepared = db
  .select()
  .from(items)
  .where(
    and(
      eq(items.itemId, sql.placeholder('id')),
      eq(items.auctionHouseId, sql.placeholder('auctionHouseId')),
    ),
  )
  .fullJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
  .prepare();

async function queryItem(id: string | number, auctionHouseId: string | number) {
  try {
    const queryResult = await prepared.get({ id, auctionHouseId });

    if (!queryResult) {
      throw new Error('Item not found');
    }

    const { items: item, items_metadata: metadata } = queryResult;
    console.log(metadata);

    if (item == null) {
      throw new Error('Item not found');
    }

    let itemFromBnet: GameItem | null = null;
    let itemFromBnetSlug = '';
    if (!metadata) {
      try {
        itemFromBnet = await getItemFromBnet(item.itemId);

        if (itemFromBnet) {
          itemFromBnetSlug = slugify(itemFromBnet.name, { lowercase: true, decamelize: true });
          await db
            .insert(itemsMetadata)
            .values({
              id: itemFromBnet.id,
              itemLevel: itemFromBnet.level,
              name: itemFromBnet.name,
              quality: qualityMap[itemFromBnet.quality.type] ?? 1,
              requiredLevel: itemFromBnet.required_level,
              slug: itemFromBnetSlug,
            })
            .onConflictDoNothing();
        }
      } catch (err: any) {
        console.error('getItemFromBnet:', err.message);
      }
    }

    return {
      server: '',
      itemId: item.itemId,
      name: metadata?.name ?? itemFromBnet?.name ?? '',
      sellPrice: 0,
      vendorPrice: 0,
      tooltip: [{ label: metadata?.name ?? itemFromBnet?.name ?? '' }],
      itemLink: '',
      uniqueName: itemFromBnetSlug,
      stats: {
        lastUpdated: item.timestamp ?? new Date().toISOString(),
        current: {
          numAuctions: item.numAuctions,
          marketValue: item.marketValue,
          historicalValue: item.historical,
          minBuyout: item.minBuyout,
          quantity: item.quantity,
        },
        previous: null,
      },
      tags: [],
      icon: null,
      itemLevel: metadata?.itemLevel ?? itemFromBnet?.level ?? 0,
      requiredLevel: metadata?.requiredLevel ?? itemFromBnet?.required_level ?? 0,
    } as NexusHub.ItemsResponse;
  } catch (err: any) {
    console.error(err);
    return { error: 'true', reason: err.message } as NexusHub.ErrorResponse;
  }
}

async function updateAuctionHouseData(
  auctionHouseId: string | number,
  itemId: string | number,
  KV_KEY: string,
) {
  return new Promise(async (resolve, reject) => {
    const ahItems = await getAuctionHouse(Number(auctionHouseId));

    if (ahItems) {
      try {
        const chunks = R.chunk(ahItems, 2000);

        for await (const chunk of chunks) {
          await db
            .insert(items)
            .values(
              chunk.map((item) => ({
                auctionHouseId: Number(auctionHouseId),
                itemId: item.itemId,
                numAuctions: item.numAuctions,
                marketValue: item.marketValue,
                historical: item.historical,
                minBuyout: item.minBuyout,
                quantity: item.quantity,
                timestamp: new Date().toISOString(),
              })),
            )
            .onConflictDoUpdate({
              target: [items.itemId, items.auctionHouseId],
              set: {
                numAuctions: sql`excluded.num_auctions`,
                marketValue: sql`excluded.market_value`,
                historical: sql`excluded.historical`,
                minBuyout: sql`excluded.min_buyout`,
                quantity: sql`excluded.quantity`,
                timestamp: sql`excluded.timestamp`,
              },
            });
        }

        // Update KV
        const result = await queryItem(itemId, auctionHouseId);
        if ('itemId' in result) {
          await kv.set(KV_KEY, JSON.stringify(result), { ex: CACHE_EXPIRATION });
        }
      } catch (err: any) {
        console.error(err.message);
        reject(err.message);
      }
    }

    resolve(null);
  });
}

export default async function handler(req: Request, context: RequestContext) {
  const ip = ipAddress(req);
  const isAllowed = await rateLimit(`item:${ip}`, MAX_REQUESTS, WINDOW_SECONDS);

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

  const itemId = getURLParam(req);
  const query = getQueries(req.url);
  const auctionHouseId = query.get('ah_id');

  if (!itemId) {
    return new Response(JSON.stringify({ error: true, message: 'Item ID is required' }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    });
  }

  if (!auctionHouseId) {
    return new Response(JSON.stringify({ error: true, message: 'Auction house ID is required' }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    });
  }

  const KV_KEY = `item:${auctionHouseId}:${itemId}`;

  const cached = await kv.get<string>(KV_KEY);
  // const cached = null;

  if (cached) {
    return new Response(JSON.stringify(cached), { status: 200, headers });
  }

  let result = await queryItem(itemId, auctionHouseId);

  if ('error' in result) {
    // Fetch auction house data
    await updateAuctionHouseData(auctionHouseId, itemId, KV_KEY);

    // Try again
    result = await queryItem(itemId, auctionHouseId);

    // Still failed, return error
    if ('error' in result) {
      const code = (() => {
        if ('reason' in result) {
          if (result.reason.includes('not found')) {
            return 404;
          }
        }

        return 500;
      })();
      const message = 'message' in result ? result.message : result.reason || 'Unknown error';

      return new Response(JSON.stringify({ error: true, message }), {
        status: code,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
        },
      });
    }
  }

  if (cached == null) {
    try {
      await kv.set(KV_KEY, JSON.stringify(result), { ex: CACHE_EXPIRATION });
    } catch (error: any) {
      console.error('kv error:', error.message || 'unknown error');
    }
  }

  const data = nexushubToItemResponse(result, Number(query.get('amount') || 1));

  // Update database in the background
  context.waitUntil(updateAuctionHouseData(auctionHouseId, itemId, KV_KEY));

  return new Response(JSON.stringify(data), {
    status: 200,
    headers,
  });
}
