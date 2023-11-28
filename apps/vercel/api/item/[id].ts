import { kv } from '@vercel/kv';
import { sql } from 'drizzle-orm';
import slugify from 'slugify';

import * as i from '../_types.js';
import {
  capitalize,
  getFactionSlug,
  getQueries,
  getServerSlug,
  getURLParam,
  nexushubToItemResponse,
} from '../_utils.js';
import { db } from '../../db/index.js';

export const config = {
  runtime: 'experimental-edge',
};

async function fetchItem(url: string) {
  return (await (await fetch(url)).json()) as i.NexusHub.ItemsResponse | i.NexusHub.ErrorResponse;
}

/**
 * @TODO Move the subqueries to "db/scripts/insert.ts" and store the results in a new table
 * to prevent every query from costing 10000s of reads
 */
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

    const result = await db.run(
      sql`SELECT i.name, i.Link, i.SellPrice, iv.*
      FROM items AS i
      JOIN items_values AS iv ON i.shortid = iv.item_shortid
      JOIN scanmeta AS sm ON iv.realm = sm.realm AND iv.faction = sm.faction
      JOIN realms r ON r.name = ${server}
      JOIN factions f ON f.name = ${faction}
      WHERE i.shortid = ${id}
        AND sm.realm = r.id
        AND sm.faction = f.id
      ORDER BY iv.ts DESC
      LIMIT 1;`,
    );

    return result.rows.length > 0
      ? ({
          server: `${(slugify as any)(server).toLowerCase()}-${(slugify as any)(faction)}`,
          itemId: result.rows[0].item_shortid,
          name: result.rows[0].name,
          sellPrice: result.rows[0].SellPrice,
          vendorPrice: null,
          tooltip: [{ label: result.rows[0].name }],
          itemLink: result.rows[0].Link,
          uniqueName: (slugify as any)(result.rows[0].name || ''),
          stats: {
            lastUpdated: result.rows[0].ts,
            current: {
              numAuctions: result.rows[0].num_auctions,
              marketValue: result.rows[0].market_value,
              historicalValue: result.rows[0].historical_value,
              minBuyout: result.rows[0].min_buyout,
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
  const version = query.get('version');
  const isClassicEra = version === 'era';
  const key = `item${isClassicEra ? ':era' : ''}:${serverSlug}:${factionSlug[0]}:${itemId}`;

  const cached = await kv.get<i.NexusHub.ItemsResponse | undefined>(key);
  // const cached = null;

  const url = `https://api.nexushub.co/wow-classic/v1/items/${serverSlug}-${factionSlug}/${itemId}`;

  let result =
    cached || isClassicEra
      ? await queryItem(Number(itemId), serverSlug, factionSlug as any)
      : await fetchItem(url);

  if ('error' in result) {
    const code = result.error ? 500 : 404;
    return new Response(JSON.stringify({ error: 'true', message: result.error }), { status: code });
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
