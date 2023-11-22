import { kv } from '@vercel/kv';
import { sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import slugify from 'slugify';

import * as i from '../_types.js';
import {
  capitalize,
  getFactionSlug,
  getQueries,
  getServerSlug,
  getURLParam,
  nexushubToItemResponse,
  supportedClassicEraServers,
} from '../_utils.js';
import { db } from '../../db/index.js';
import { auctions, items, scanmeta, selectAuctionsSchema } from '../../db/schema.js';

export const config = {
  runtime: 'experimental-edge',
};

async function fetchItem(url: string) {
  return (await (await fetch(url)).json()) as i.NexusHub.ItemsResponse | i.NexusHub.ErrorResponse;
}

async function queryItem(id: number, server: string, faction: 'Neutral' | 'Alliance' | 'Horde') {
  try {
    // const i = alias(items, 'i');
    // const s = alias(scanmeta, 's');
    // const a = alias(auctions, 'a');

    // Never resolves on dev??? WHYYYYYYYY
    // const item = await db
    //   .select({
    //     id: a.id,
    //     itemId: a.itemId,
    //     minBid: a.minBid,
    //     buyout: a.buyout,
    //     curBid: a.curBid,
    //     timestamp: a.timestamp,
    //   })
    //   .from(a)
    //   .fullJoin(i, eq(a.itemId, i.id))
    //   .fullJoin(s, eq(a.scanId, s.id))
    //   .where(and(eq(i.shortid, id), eq(s.realm, server.toLowerCase()), eq(s.faction, faction)))
    //   .orderBy(desc(a.timestamp))
    //   .get()
    //   .catch((err) => {
    //     console.error(err);
    //     return null;
    //   });

    const realm = capitalize(server);
    const _faction = capitalize(faction);

    const result = await db.run(
      sql`SELECT a.*, i.*, s.realm,
        (
          SELECT COUNT(*)
          FROM auctions a2
          WHERE a2.itemId = a.itemId
            AND strftime('%Y-%m-%d', a2.ts) = strftime('%Y-%m-%d', a.ts)
            AND s.realm = ${realm}
            AND s.faction = ${_faction}
        ) as numAuctions,
        (
          SELECT a2.buyout / a2.itemCount
          FROM auctions a2
          WHERE a2.itemId = a.itemId
        ) as marketValue,
        (
          SELECT MIN(a2.buyout)
          FROM auctions a2
          WHERE a2.itemId = a.itemId
            AND strftime('%Y-%m-%d', a2.ts) = strftime('%Y-%m-%d', a.ts)
            AND s.realm = ${realm}
            AND s.faction = ${_faction}
        ) as minBuyout,
        (
          SELECT SUM(a2.itemCount)
          FROM auctions a2
          WHERE a2.itemId = a.itemId
            AND strftime('%Y-%m-%d', a2.ts) = strftime('%Y-%m-%d', a.ts)
        ) as quantity
        FROM auctions a
        JOIN items i ON a.itemId = i.id
        JOIN scanmeta s ON a.scanId = s.id
        WHERE i.shortid = ${id}
          AND s.realm = ${realm}
          AND s.faction = ${_faction}
        ORDER BY a.ts DESC
        LIMIT 1;`,
    );

    return result.rows.length > 0
      ? ({
          server: `${(slugify as any)(server).toLowerCase()}-${(slugify as any)(faction)}`,
          itemId: result.rows[0].shortid,
          name: result.rows[0].name,
          sellPrice: result.rows[0].SellPrice,
          vendorPrice: null,
          tooltip: [{ label: result.rows[0].name }],
          itemLink: result.rows[0].Link,
          uniqueName: (slugify as any)(result.rows[0].name || ''),
          stats: {
            lastUpdated: result.rows[0].ts,
            current: {
              numAuctions: result.rows[0].numAuctions,
              marketValue: Math.round(result.rows[0].marketValue as number),
              historicalValue: 0,
              minBuyout: result.rows[0].minBuyout,
              quantity: result.rows[0].quantity,
            },
            previous: null,
          },
          tags: [],
          icon: null,
          itemLevel: null,
          requiredLevel: result.rows[0].MinLevel,
        } as i.NexusHub.ItemsResponse)
      : ({ error: 'true', reason: 'no results' } as i.NexusHub.ErrorResponse);
  } catch (err: any) {
    console.error(err);
    return { error: 'true', reason: err.message } as i.NexusHub.ErrorResponse;
  }
}

export default async function handler(req: Request) {
  const itemId = getURLParam(req);
  const query = getQueries(req.url);
  const serverSlug = getServerSlug(query.get('server_name')!);
  const factionSlug = getFactionSlug(query.get('faction')!);
  const type = query.get('type');
  const isClassicEraServer = type === 'era';
  const key = `item${isClassicEraServer ? ':era' : ''}:${serverSlug}:${factionSlug[0]}:${itemId}`;

  const cached = await kv.get<i.NexusHub.ItemsResponse | undefined>(key);
  // const cached = null;

  const url = `https://api.nexushub.co/wow-classic/v1/items/${serverSlug}-${factionSlug}/${itemId}`;

  let result =
    cached || isClassicEraServer
      ? await queryItem(Number(itemId), serverSlug, factionSlug as any)
      : await fetchItem(url);

  if ('error' in result) {
    const code = result.error ? 500 : 404;
    return new Response(JSON.stringify({ error: 'true', message: result.error }), { status: code });
  }

  if (cached == null) {
    try {
      await kv.set(key, JSON.stringify(result), {
        ex: 10_800,
      });
    } catch (error) {
      console.error('kv error:', error);
    }
  }

  const data = nexushubToItemResponse(result, Number(query.get('amount') || 1));
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
