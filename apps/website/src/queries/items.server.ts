import { getCloudflareData } from 'db/cloudflare.server';
import '@tanstack/react-start/server-only';
import { and, eq, asc, gt } from 'drizzle-orm';

import { db } from 'db';
import { items, itemsMetadata } from 'db/schema';
import { historyRangeDays } from 'services/history-range';
import type { HistoryRange } from 'services/history-range';

export async function getItemFromSlug(slug: string) {
  const cloudflare = await getCloudflareData();
  if (cloudflare) return cloudflare.itemFromSlug(slug);
  return db.query.itemsMetadata.findFirst({
    where: (itemsMetadata, { eq }) => eq(itemsMetadata.slug, slug),
    columns: { name: true },
  });
}

export async function getItemWithId(id: number | string) {
  const cloudflare = await getCloudflareData();
  if (cloudflare) return cloudflare.item(Number(id));
  return db.query.itemsMetadata.findFirst({
    where: (itemsMetadata, { eq }) => eq(itemsMetadata.id, Number(id)),
  });
}

export async function getItemHistory(
  itemId: number | string,
  auctionHouseId: number | string,
  region: string,
  range: HistoryRange = '7d',
) {
  const cloudflare = await getCloudflareData();
  if (cloudflare) return cloudflare.history(Number(itemId), Number(auctionHouseId), region, range);
  const days = historyRangeDays[range];
  const since = days === null ? 0 : Date.now() - days * 24 * 60 * 60 * 1000;
  const itemHistory = await db
    .select({
      minBuyout: items.minBuyout,
      marketValue: items.marketValue,
      historical: items.historical,
      timestamp: items.timestamp,
    })
    .from(items)
    .where(
      and(
        eq(itemsMetadata.id, Number(itemId)),
        eq(items.auctionHouseId, Number(auctionHouseId)),
        gt(items.timestamp, new Date(since)),
      ),
    )
    .leftJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
    .orderBy(asc(items.timestamp));

  return {
    points: itemHistory.flatMap((item) =>
      item.timestamp
        ? [
            {
              minBuyout: Number(item.minBuyout),
              marketValue: Number(item.marketValue),
              historical: Number(item.historical),
              timestamp: item.timestamp,
            },
          ]
        : [],
    ),
    archiveUnavailable: false,
  };
}
