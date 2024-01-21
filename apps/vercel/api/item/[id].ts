import { ipAddress, RequestContext } from '@vercel/edge';
import { and, eq, sql } from 'drizzle-orm';
import * as R from 'remeda';

import type { NexusHub } from '../_types.js';
import { getQueries, getURLParam, qualityMap } from '../_utils.js';
import { rateLimit } from '../_rate-limiter.js';
import { getAuctionHouse, getItem } from '../_tsm.js';
import { db } from '../../db/index.js';
import { items, itemsMetadata } from '../../db/schema.js';
import { getItemFromBnet } from '../_blizzard/index.ts.js';
import slugify from '@sindresorhus/slugify';
import { GameItem } from '../_blizzard/types.js';

export const config = {
  runtime: 'edge',
};

const MAX_REQUESTS = 100;
const WINDOW_SECONDS = 60;
const headers = {
  'content-type': 'application/json',
  'cache-control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate',
  'Access-Control-Allow-Origin': '*',
};
const errorHeaders = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
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
    // Check if item is in DB
    const queryResult = await prepared.get({ id, auctionHouseId });

    // If not in DB, fetch item from TSM
    if (queryResult == null || queryResult.items == null) {
      const item = await getItem(Number(id), Number(auctionHouseId));

      if (!item) {
        throw new Error('Item not found');
      }

      // Fetch item metadata and save to DB
      const itemFromBnet = await getItemFromBnet(item.itemId);
      const itemFromBnetSlug = slugify(itemFromBnet.name, { lowercase: true, decamelize: true });

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

      return {
        server: '',
        itemId: item.itemId,
        name: itemFromBnet.name,
        sellPrice: 0,
        vendorPrice: 0,
        tooltip: [{ label: itemFromBnet.name }],
        itemLink: '',
        uniqueName: slugify(itemFromBnet.name, { lowercase: true, decamelize: true }),
        stats: {
          lastUpdated: new Date().toISOString(),
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
        itemLevel: itemFromBnet.level,
        requiredLevel: itemFromBnet.required_level,
      } as NexusHub.ItemsResponse;
    }

    const { items: item, items_metadata: metadata } = queryResult;
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

async function updateAuctionHouseData(auctionHouseId: string | number, itemId: string | number) {
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
              timestamp: new Date().toISOString(),
            },
          });
      }
    } catch (err: any) {
      console.error(err.message);
    }
  }
}

export default async function handler(req: Request, context: RequestContext) {
  const ip = ipAddress(req);
  const isAllowed = await rateLimit(`item:${ip}`, MAX_REQUESTS, WINDOW_SECONDS);

  if (!isAllowed) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        ...errorHeaders,
        'content-type': 'text/plain',
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
    return (
      Response.json({ error: true, message: 'Item ID is required' }),
      {
        status: 400,
        headers: errorHeaders,
      }
    );
  }

  if (!auctionHouseId) {
    return Response.json(
      { error: true, message: 'Auction house ID is required' },
      { status: 400, headers: errorHeaders },
    );
  }

  // Update database in the background (if needed)
  context.waitUntil(updateAuctionHouseData(auctionHouseId, itemId));

  let result = await queryItem(itemId, auctionHouseId);

  if ('error' in result) {
    return Response.json(result, { status: 404, headers: errorHeaders });
  }

  return Response.json(result, { status: 200, headers });
}
