import { kv } from '@vercel/kv';
import { ipAddress } from '@vercel/edge';
import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import slugify from 'slugify';

import type { NexusHub } from '../_types.js';
import {
  getFactionSlug,
  getQueries,
  getServerSlug,
  getURLParam,
  nexushubToItemResponse,
} from '../_utils.js';
import { db } from '../../db/index.js';
import { factions, items, itemsValues, realms, scanmeta } from '../../db/schema.js';
import { rateLimit } from '../_rate-limiter.js';

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

const i = alias(items, 'i');
const s = alias(scanmeta, 's');
const iv = alias(itemsValues, 'iv');
const r = alias(realms, 'r');
const f = alias(factions, 'f');
const prepared = db
  .select({
    name: i.name,
    link: i.link,
    minLevel: i.minLevel,
    sellPrice: i.sellPrice,
    itemValues: iv,
  })
  .from(i)
  .fullJoin(iv, eq(iv.itemShortid, i.shortid))
  .fullJoin(s, and(eq(s.realm, iv.realm), eq(s.faction, iv.faction)))
  .fullJoin(r, eq(r.name, sql.placeholder('realm')))
  .fullJoin(f, eq(f.name, sql.placeholder('faction')))
  .where(and(eq(i.shortid, sql.placeholder('id')), eq(s.realm, r.id), eq(s.faction, f.id)))
  .orderBy(desc(iv.timestamp))
  .limit(1)
  .prepare();

async function queryItem(id: number, realm: string, faction: 'Neutral' | 'Alliance' | 'Horde') {
  try {
    const item = await prepared
      .get({
        id,
        realm: realm.toLowerCase(),
        faction,
      })
      .catch((err) => {
        console.error(err);
        return null;
      });

    if (item?.itemValues == null) {
      throw new Error('Item not found');
    }

    return {
      server: `${(slugify as any)(realm).toLowerCase()}-${(slugify as any)(faction)}`,
      itemId: item.itemValues.itemShortid.toString(),
      name: item.name || '',
      sellPrice: item.sellPrice || 0,
      vendorPrice: null,
      tooltip: [{ label: item.name || '' }],
      itemLink: item.link,
      uniqueName: (slugify as any)(item.name || ''),
      stats: {
        lastUpdated: item.itemValues.timestamp || new Date().toISOString(),
        current: {
          numAuctions: item.itemValues.numAuctions,
          marketValue: item.itemValues.marketValue,
          historicalValue: item.itemValues.historicalValue,
          minBuyout: item.itemValues.minBuyout,
          quantity: item.itemValues.quantity,
        },
        previous: null,
      },
      tags: [],
      icon: null,
      itemLevel: null,
      requiredLevel: item.minLevel,
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
  const serverSlug = getServerSlug(query.get('server_name')!).toLowerCase();
  const factionSlug = getFactionSlug(query.get('faction')!);
  const version = query.get('version');
  const isClassicEra = version === 'era';
  const key = `item${isClassicEra ? ':era' : ''}:${serverSlug}:${factionSlug[0]}:${itemId}`;

  const cached = await kv.get<NexusHub.ItemsResponse | undefined>(key);
  // const cached = null;

  const url = `https://api.nexushub.co/wow-classic/v1/items/${serverSlug}-${factionSlug}/${itemId}`;

  let result = cached
    ? cached
    : isClassicEra
    ? await queryItem(Number(itemId), serverSlug, factionSlug as any)
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
