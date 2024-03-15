'use server';

import { and, desc, eq, isNotNull, like, or, sql } from 'drizzle-orm';

import { db } from 'db';
import { itemsMetadata, recentSearches, items } from 'db/schema';

export async function searchItem(search: string) {
  const results = await db
    .select({
      id: itemsMetadata.id,
      name: itemsMetadata.name,
      slug: itemsMetadata.slug,
      icon: itemsMetadata.icon,
      quality: itemsMetadata.quality,
    })
    .from(itemsMetadata)
    .where(
      or(
        and(sql`similarity(name, ${search}) > 0.1`, isNotNull(itemsMetadata.icon)),
        like(itemsMetadata.name, `%${search}%`),
      ),
    )
    .orderBy(sql`similarity(name, ${search}) DESC`)
    .limit(10);

  return results;
}

export async function addRecentSearch(search: string, itemId: number) {
  try {
    await db.insert(recentSearches).values({ search, itemId });
  } catch (error: any) {
    console.error('Error adding recent search:', error.message);
  }
}

export async function getRecentSearches() {
  const searches = await db
    .select({
      id: recentSearches.id,
      search: recentSearches.search,
      itemId: recentSearches.itemId,
      name: itemsMetadata.name,
      slug: itemsMetadata.slug,
      icon: itemsMetadata.icon,
      quality: itemsMetadata.quality,
    })
    .from(recentSearches)
    .orderBy(desc(recentSearches.timestamp))
    .leftJoin(itemsMetadata, eq(recentSearches.itemId, itemsMetadata.id))
    .limit(10);

  const itemsFromSearches = await Promise.all(
    searches.map((item) => {
      return db
        .select({
          itemId: items.itemId,
          minBuyout: items.minBuyout,
          marketValue: items.marketValue,
          lastUpdated: items.timestamp,
        })
        .from(items)
        .where(eq(items.itemId, item.itemId))
        .orderBy(desc(items.timestamp))
        .limit(2);
    }),
  );

  const compoundItems = itemsFromSearches.map((items) => ({
    ...items[0],
    diffMinBuyout: (items[0]?.minBuyout ?? 0) - (items[1]?.minBuyout ?? 0),
    diffMarketValue: (items[0]?.marketValue ?? 0) - (items[1]?.marketValue ?? 0),
  }));

  // combine the searches with the items
  const results = searches.map((search) => {
    const item = compoundItems.find((item) => item.itemId === search.itemId);
    return { ...search, ...item };
  });

  return results;
}
