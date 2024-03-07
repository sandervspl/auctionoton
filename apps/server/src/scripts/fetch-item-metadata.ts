import { asc, eq, isNull } from 'drizzle-orm';
import slugify from '@sindresorhus/slugify';

import { db } from '../db';
import { items, itemsMetadata } from '../db/schema';
import { getAccessToken, getItemFromBnet } from '../utils/blizzard/index.ts';
import { qualityMap } from '../utils';

console.info('Fetching Blizzard access token...');
await getAccessToken();

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
