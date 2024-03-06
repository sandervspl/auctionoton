import slugify from '@sindresorhus/slugify';

import { db } from '../db';
import { items, itemsMetadata } from '../db/schema';
import { getAccessToken, getItemFromBnet } from '../utils/blizzard/index.ts';
import { qualityMap } from '../utils';
import { asc } from 'drizzle-orm';

const sets: number[][] = [];
// Add [0,100], [100,200] up to 4500
for (let i = 0; i < 4500; i += 100) {
  sets.push([i, i + 100]);
}

console.info('Fetching Blizzard access token...');
await getAccessToken();

const currentItemMetadata = await db
  .select({
    id: itemsMetadata.id,
  })
  .from(itemsMetadata)
  .catch((error) => {
    console.error(error.message);
    return [];
  });

const itemMetadataSet = new Set(currentItemMetadata.map((item) => item.id));
console.log('current metadata items', itemMetadataSet.size);

for await (const [offset, limit] of sets) {
  const uniqueItems = await db
    .selectDistinct({
      itemId: items.itemId,
    })
    .from(items)
    .orderBy(asc(items.itemId))
    .offset(offset)
    .limit(limit)
    .catch((error) => {
      console.error(error.message);
      return [];
    });

  for await (const item of uniqueItems) {
    if (itemMetadataSet.has(item.itemId)) {
      continue;
    }

    const itemFromBnet = await getItemFromBnet(item.itemId);
    const itemFromBnetSlug = slugify(itemFromBnet.name, { lowercase: true, decamelize: true });

    console.info(`Adding metadata for "${itemFromBnet.name}" (${offset}-${limit} ${item.itemId})`);

    await db
      .insert(itemsMetadata)
      .values({
        id: itemFromBnet.id,
        itemLevel: itemFromBnet.level,
        name: itemFromBnet.name,
        quality: qualityMap[itemFromBnet.quality.type] ?? 1,
        requiredLevel: itemFromBnet.required_level,
        slug: itemFromBnetSlug,
      })
      .onConflictDoNothing();
  }
}
