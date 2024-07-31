'use server';

import { and, desc, isNotNull, like, or, sql, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

import { db } from 'db';
import { itemsMetadata, recentSearches } from 'db/schema';

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
  const { userId } = auth();
  if (!userId) {
    redirect('/?error=unauthorized');
  }

  await db.insert(recentSearches).values({ search, itemId, userId });
}

type RecentSearchItem = {
  recent_search_id: number;
  item_id: number;
  search: string;
  recent_search_timestamp: string;
  auction_house_id: number;
  pet_species_id: number | null;
  min_buyout: number;
  quantity: number;
  market_value: number;
  historical: number;
  num_auctions: number;
  item_timestamp: string;
  name: string;
};

export async function getRecentSearches() {
  const auctionHouseId = cookies().get('auctionhouse_id');

  if (!auctionHouseId) {
    return [];
  }

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
    .leftJoin(itemsMetadata, eq(recentSearches.itemId, itemsMetadata.id))
    .orderBy(desc(recentSearches.timestamp))
    .limit(10);

  if (searches.length === 0) {
    return [];
  }

  const itemsFromSearches: RecentSearchItem[] = await db.execute(sql`
WITH recent_searches_cte AS (
  SELECT id, item_id, search, timestamp
  FROM recent_searches
  ORDER BY timestamp DESC
  LIMIT 10
),
items_cte AS (
  SELECT
    i.*,
    ROW_NUMBER() OVER (PARTITION BY i.item_id ORDER BY i.timestamp DESC) as rn
  FROM items i
  JOIN recent_searches_cte rsc ON i.item_id = rsc.item_id
  AND i.auction_house_id = ${auctionHouseId.value}
)
SELECT
  rsc.id as recent_search_id,
  rsc.item_id,
  rsc.search,
  rsc.timestamp as recent_search_timestamp,
  meta.name,
  i.auction_house_id,
  i.pet_species_id,
  i.min_buyout,
  i.quantity,
  i.market_value,
  i.historical,
  i.num_auctions,
  i.timestamp as item_timestamp
FROM recent_searches_cte rsc
JOIN items_cte i ON rsc.item_id = i.item_id
JOIN items_metadata meta ON rsc.item_id = meta.id
WHERE i.rn <= 2
ORDER BY rsc.timestamp DESC, i.item_id, i.timestamp DESC;
`);

  const grouped: { [key: string]: RecentSearchItem[] } = {};

  for (const item of itemsFromSearches) {
    if (!grouped[item.item_id]) {
      grouped[item.item_id] = [];
    }
    grouped[item.item_id]!.push(item);
  }

  const groupedItems = Object.values(grouped).map((items) =>
    items.sort(
      (a, b) => new Date(b.item_timestamp).getTime() - new Date(a.item_timestamp).getTime(),
    ),
  );

  const compoundItems = groupedItems.map((items) => ({
    ...items[0],
    diffMinBuyout: (items[0]?.min_buyout ?? 0) - (items[1]?.min_buyout ?? 0),
    diffMarketValue: (items[0]?.market_value ?? 0) - (items[1]?.market_value ?? 0),
  }));

  // combine the searches with the items
  const results = searches.map((search) => {
    const item = compoundItems.find((item) => item.item_id === search.itemId);
    return { ...search, ...item };
  });

  return results;
}
