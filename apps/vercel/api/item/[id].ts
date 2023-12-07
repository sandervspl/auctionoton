import { kv } from '@vercel/kv';
import { ipAddress } from '@vercel/edge';
import slugify from 'slugify';
import { and, eq, sql } from 'drizzle-orm';

import type { NexusHub } from '../_types.js';
import {
  getFactionSlug,
  getQueries,
  getServerSlug,
  getURLParam,
  nexushubToItemResponse,
} from '../_utils.js';
import { rateLimit } from '../_rate-limiter.js';
import { getAuctionHouse, getRealms, getRegions } from '../_tsm.js';
import { db } from '../../db/index.js';
import { items } from '../../db/schema.js';

export const config = {
  runtime: 'edge',
};

async function fetchItem(url: string) {
  const res = await fetch(url);

  if (res.status !== 200) {
    return {
      error: true,
      status: res.status,
      message: res.statusText,
    } as const;
  }

  const data = (await res.json()) as NexusHub.ItemsResponse | NexusHub.ErrorResponse;

  return data;
}

const prepared = db
  .select()
  .from(items)
  .where(
    and(
      eq(items.itemId, sql.placeholder('id')),
      eq(items.auctionHouseId, sql.placeholder('auctionHouseId')),
    ),
  )
  .prepare();

async function queryItem(
  id: number,
  realmSlug: string,
  faction: 'Neutral' | 'Alliance' | 'Horde',
  region: string,
  version: string,
) {
  try {
    const regions = await getRegions();
    const regionId = regions?.find((r) => r.regionPrefix === region)?.regionId;
    if (!regionId) {
      throw new Error(`Region "${region}" not found`);
    }

    const realms = await getRealms(regionId);
    console.log(realms);
    const realm = realms?.find((r) => getServerSlug(r.name) === realmSlug);
    if (!realm) {
      throw new Error(`Realm "${realmSlug} (${region})" not found`);
    }

    const auctionHouseId = realm.auctionHouses.find(
      (ah) => getFactionSlug(ah.type) === faction,
    )?.auctionHouseId;
    if (!auctionHouseId) {
      throw new Error(`Auction house for "${faction}" on "${realmSlug} (${region})" not found`);
    }

    const ahItems = await getAuctionHouse(auctionHouseId);
    if (ahItems) {
      await db.insert(items).values(ahItems).run();
    }

    const item = await prepared.get({ id, auctionHouseId });

    if (!item) {
      throw new Error('Item not found');
    }

    return {
      server: `${(slugify as any)(realmSlug).toLowerCase()}-${(slugify as any)(faction)}`,
      itemId: item.itemId,
      name: '',
      sellPrice: 0,
      vendorPrice: null,
      tooltip: [{ label: '' }],
      itemLink: '',
      uniqueName: '',
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
      itemLevel: null,
      requiredLevel: null,
    } as NexusHub.ItemsResponse;
  } catch (err: any) {
    console.error(err);
    return { error: 'true', reason: err.message } as NexusHub.ErrorResponse;
  }
}

const MAX_REQUESTS = 100;
const WINDOW_SECONDS = 60;

export default async function handler(req: Request) {
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
  const serverSlug = getServerSlug(query.get('server_name')!);
  const factionSlug = getFactionSlug(query.get('faction')!);
  const region = query.get('region')!;
  const version = query.get('version');
  const isClassicEra = version === 'era';
  const key = `item${isClassicEra ? ':era' : ''}:${serverSlug}:${factionSlug[0]}:${itemId}`;

  const cached = await kv.get<NexusHub.ItemsResponse | undefined>(key);
  // const cached = null;

  const url = `https://api.nexushub.co/wow-classic/v1/items/${serverSlug}-${factionSlug}/${itemId}`;

  let result = cached
    ? cached
    : isClassicEra
    ? await queryItem(Number(itemId), serverSlug, factionSlug as any, region)
    : await fetchItem(url);

  if ('error' in result) {
    const code = 'status' in result ? result.status : 500;
    const message = 'message' in result ? result.message : result.reason || 'Unknown error';
    return new Response(JSON.stringify({ error: true, message }), {
      status: code,
      headers: { 'cache-control': 'no-store' },
    });
  }

  if (cached == null) {
    try {
      await kv.set(key, JSON.stringify(result), {
        ex: isClassicEra ? 21_600 : 10_800,
      });
    } catch (error: any) {
      console.error('kv error:', error.message || 'unknown error');
    }
  }

  const data = nexushubToItemResponse(result, Number(query.get('amount') || 1));
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'cache-control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
