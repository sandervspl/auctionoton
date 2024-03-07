import { asc, eq, isNull, not } from 'drizzle-orm';
import slugify from '@sindresorhus/slugify';

import { db } from '../db';
import { items, itemsMetadata } from '../db/schema';
import { getAccessToken, getItemFromBnet } from '../utils/blizzard/index.ts';
import { qualityMap } from '../utils';

const blacklistedItems = new Set(
  //   [
  //   5108, 5140, 7192, 9186, 14469, 14473, 14477, 14478, 14479, 14480, 14481, 14484, 14485, 14491,
  //   14498, 14500, 14504, 14505, 18401,
  // ]
);

const sets: number[][] = [];
// Add [0,100], [100,200] up to 4500
for (let i = 0; i < 4500; i += 100) {
  sets.push([i, i + 100]);
}

console.info('Fetching Blizzard access token...');
await getAccessToken();

// const currentItemMetadata = await db
//   .select({
//     id: itemsMetadata.id,
//   })
//   .from(itemsMetadata)
//   .catch((error) => {
//     console.error(error.message);
//     return [];
//   });

// const itemMetadataSet = new Set(currentItemMetadata.map((item) => item.id));
// console.log('current metadata items', itemMetadataSet.size);

const missingItems = await db
  .selectDistinct({
    itemId: items.itemId,
  })
  .from(items)
  .leftJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
  .where(isNull(itemsMetadata.id))
  .orderBy(asc(items.itemId))
  .catch((error) => {
    console.error(error.message);
    return [];
  });

console.info('Items without metadata:', missingItems.length);

for await (const item of missingItems) {
  // if (itemMetadataSet.has(item.itemId) || blacklistedItems.has(item.itemId)) {
  //   continue;
  // }

  const itemFromBnet = await getItemFromBnet(item.itemId).catch((error) => {
    return null;
  });

  if (itemFromBnet == null) {
    continue;
  }

  const itemFromBnetSlug = slugify(itemFromBnet.name, { lowercase: true, decamelize: true });

  console.info(`Adding metadata for "${itemFromBnet.name}" (${item.itemId})`);

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

process.exit();
