'use server';

import { and, isNotNull, sql } from 'drizzle-orm';

import { db } from 'db';
import { itemsMetadata } from 'db/schema';

export async function searchItem(search: string) {
  const results = await db
    .select({
      id: itemsMetadata.id,
      name: itemsMetadata.name,
      slug: itemsMetadata.slug,
      icon: itemsMetadata.icon,
    })
    .from(itemsMetadata)
    .where(and(sql`similarity(name, ${search}) > 0.3`, isNotNull(itemsMetadata.icon)))
    .orderBy(sql`similarity(name, ${search}) DESC`)
    .limit(10);

  return results;
}
