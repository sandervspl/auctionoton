import { db } from 'db';
import { items, itemsMetadata } from 'db/schema';
import { and, eq, asc, gt } from 'drizzle-orm';

export async function getItemFromSlug(slug: string) {
  return db.query.itemsMetadata.findFirst({
    where: (itemsMetadata, { eq }) => eq(itemsMetadata.slug, slug),
    columns: { name: true },
  });
}

export async function getItemWithId(id: number | string) {
  return db.query.itemsMetadata.findFirst({
    where: (itemsMetadata, { eq }) => eq(itemsMetadata.id, Number(id)),
  });
}

export async function getItemHistory(itemId: number | string, auctionHouseId: number) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
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
    .where(
      and(
        eq(itemsMetadata.id, Number(itemId)),
        eq(items.auctionHouseId, auctionHouseId),
        gt(items.timestamp, new Date(sevenDaysAgo)),
      ),
    )
    .leftJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
    .orderBy(asc(items.timestamp));

  return itemHistory;
}
