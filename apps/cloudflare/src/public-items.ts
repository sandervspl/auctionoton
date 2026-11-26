import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from './env';
import { versions, type Region, type Version } from './contracts';
import { itemIconUrl } from './item-icons';
import { PUBLIC_CACHE_CONTROL, marketCacheTag } from './public-cache';

export const MAX_ITEM_BATCH = 50;
// Blizzard's quality order, as stored in item_metadata.quality.
const qualityNames = [
  'Poor',
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Artifact',
  'Heirloom',
];
type Market = { auctionHouseId: number; version: Version; region?: Region };
type PriceRow = {
  item_id: number;
  min_buyout: number;
  market_value: number;
  historical: number;
  fetched_at: string;
  region: Region;
  name: string | null;
  quality: number | null;
  slug: string | null;
  icon: string | null;
  item_level: number | null;
  required_level: number | null;
};

export async function readPublicItems(
  db: Pick<D1Database, 'prepare'>,
  market: Market,
  itemIds: number[],
) {
  const houses = (market.region ? [market.region] : ['eu', 'us']).map(
    (region) => `${market.version}-${region}-${market.auctionHouseId}`,
  );
  const rows = await db
    .prepare(`SELECT p.item_id, p.min_buyout, p.market_value,
    p.historical, s.fetched_at, s.region,
    m.name, m.quality, m.slug, m.icon, m.item_level, m.required_level
    FROM published_houses h
    JOIN snapshots s ON s.id = h.snapshot_id AND s.status = 'complete'
    JOIN prices p ON p.snapshot_id = s.id
    LEFT JOIN item_metadata m ON m.id = p.item_id
    WHERE h.house_key IN (${houses.map(() => '?').join(',')})
    AND p.item_id IN (${itemIds.map(() => '?').join(',')})`)
    .bind(...houses, ...itemIds)
    .all<PriceRow>();
  const byId = new Map(rows.results.map((row) => [row.item_id, row]));
  return {
    ambiguous: byId.size !== rows.results.length,
    missingItemIds: itemIds.filter((id) => !byId.has(id)),
    items: itemIds.flatMap((itemId) => {
      const price = byId.get(itemId);
      if (!price) return [];
      return [
        {
          server: '',
          itemId,
          name: price.name ?? `Item ${itemId}`,
          sellPrice: 0,
          vendorPrice: 0,
          tooltip: [{ label: price.name ?? `Item ${itemId}` }],
          itemLink: '',
          uniqueName: price.slug ?? `item-${itemId}`,
          stats: {
            lastUpdated: price.fetched_at,
            current: {
              marketValue: price.market_value,
              historicalValue: price.historical,
              minBuyout: price.min_buyout,
            },
            previous: null,
          },
          // The first tag is the item's quality; clients colour item names by it.
          tags: price.quality === null ? [] : [qualityNames[price.quality] ?? 'Common'],
          icon: price.icon === null ? null : itemIconUrl(price.icon),
          itemLevel: price.item_level,
          requiredLevel: price.required_level,
        },
      ];
    }),
  };
}

async function respond(c: Context<{ Bindings: Env }>, single: boolean) {
  c.header('Cache-Control', 'no-store');
  const ah = Number(c.req.param('ah_id'));
  const version = c.req.param('version') as Version;
  const region = c.req.query('region') as Region | undefined;
  const rawIds = single ? [c.req.param('id') ?? ''] : (c.req.query('ids') ?? '').split(',');
  const ids = [...new Set(rawIds.map(Number))].sort((a, b) => a - b);
  if (
    !Number.isSafeInteger(ah) ||
    ah <= 0 ||
    !versions.includes(version) ||
    (!single && !region) ||
    (region !== undefined && !['eu', 'us'].includes(region)) ||
    rawIds.length > MAX_ITEM_BATCH ||
    rawIds.some((id) => !/^\d+$/.test(id)) ||
    ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
  ) {
    return c.json({ error: true, reason: 'Invalid item query' }, 400);
  }
  const result = await readPublicItems(c.env.MARKET, { auctionHouseId: ah, version, region }, ids);
  if (result.ambiguous)
    return c.json({ error: true, reason: 'Ambiguous auction house region' }, 409);
  if (single && !result.items.length) return c.json({ error: true, reason: 'Item not found' }, 404);
  c.header('Cache-Control', PUBLIC_CACHE_CONTROL);
  c.header(
    'Cache-Tag',
    (region ? [region] : ['eu', 'us'])
      .map((region) => marketCacheTag(`${version}-${region}-${ah}`))
      .join(','),
  );
  c.header(
    'X-Auctionoton-Stale',
    String(
      result.items.some(
        (item) => Date.now() - Date.parse(item.stats.lastUpdated) > 26 * 60 * 60_000,
      ),
    ),
  );
  return single
    ? c.json(result.items[0]!)
    : c.json({ items: result.items, missingItemIds: result.missingItemIds });
}

export const publicItems = new Hono<{ Bindings: Env }>()
  .get('/item/:id/ah/:ah_id/:version', (c) => respond(c, true))
  .get('/items/ah/:ah_id/:version', (c) => respond(c, false));
