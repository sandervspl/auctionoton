import { db } from 'db';
import { items, itemsMetadata } from 'db/schema';
import { and, eq, asc } from 'drizzle-orm';

export async function getItemHistory(itemSlug: string, auctionHouseId: number) {
  const itemHistory = await db
    .select({
      minBuyout: items.minBuyout,
      quantity: items.quantity,
      marketValue: items.marketValue,
      historical: items.historical,
      numAuctions: items.numAuctions,
      timestamp: items.timestamp,
      icon: itemsMetadata.icon,
      name: itemsMetadata.name,
      quality: itemsMetadata.quality,
    })
    .from(items)
    .where(and(eq(itemsMetadata.slug, itemSlug!), eq(items.auctionHouseId, auctionHouseId)))
    .leftJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
    .orderBy(asc(items.timestamp));

  return itemHistory;
}
