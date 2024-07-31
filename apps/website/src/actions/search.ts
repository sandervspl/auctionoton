'use server';

import { and, isNotNull, like, or, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs';
import { createServerAction } from 'zsa';
import { z } from 'zod';

import { db } from 'db';
import { itemsMetadata, recentSearches } from 'db/schema';

export const searchItem = createServerAction()
  .input(z.string())
  .handler(async ({ input: search }) => {
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
  });

export async function addRecentSearch(search: string, itemId: number) {
  const { userId } = auth();
  if (!userId) {
    return;
  }

  await db.insert(recentSearches).values({ search, itemId, userId });
}
