import { createServerFn } from '@tanstack/react-start';
import { and, isNotNull, like, or, sql } from 'drizzle-orm';
import { getAccessSession } from 'services/access.server';
import { z } from 'zod';

import { db } from 'db';
import { itemsMetadata, recentSearches } from 'db/schema';

export const searchItem = createServerFn({ method: 'GET' })
  .validator(z.string().trim().min(1).max(200))
  .handler(async ({ data: search }) => {
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

export const addRecentSearch = createServerFn({ method: 'POST' })
  .validator(z.object({ search: z.string().max(200), itemId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const session = await getAccessSession();
    if (!session) return;
    await db.insert(recentSearches).values({ ...data, userId: session.userId });
  });
