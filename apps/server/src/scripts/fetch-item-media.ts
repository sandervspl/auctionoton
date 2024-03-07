import pMap from 'p-map';

import { db } from '../db';
import { getAccessToken, getItemMediaFromBnet } from '../utils/blizzard/index.ts';
import { itemsMetadata } from '../db/schema';
import { asc, eq } from 'drizzle-orm';

console.info('Fetching Blizzard access token...');
await getAccessToken();

const items = await db.query.itemsMetadata.findMany({
  columns: {
    id: true,
  },
  where: eq(
    itemsMetadata.icon,
    'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg',
  ),
  orderBy: asc(itemsMetadata.id),
});

await pMap(
  items,
  async (item) => {
    const media = await getItemMediaFromBnet(item.id).catch((error) => {
      return null;
    });

    if (media == null) {
      return;
    }

    console.info(`Adding media for item ${item.id}`);

    await db
      .update(itemsMetadata)
      .set({ icon: media.assets[0].value })
      .where(eq(itemsMetadata.id, item.id));
  },
  { concurrency: 3 },
);
