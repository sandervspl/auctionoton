import * as R from 'remeda';

import * as i from '../../types';
import { getAuctionHouse, tsmApiKeys } from '../../utils/tsm';
import { createDbClient } from '../../db';
import { items } from '../../db/schema';
import { Item } from '../../types/tsm';
import { KEYS, kv } from '../../kv';

const queue = new Map<string | number, Promise<Item[] | undefined>>();

export async function updateAuctionHouseData(
  auctionHouseId: string | number,
  version: i.GameVersion,
) {
  console.info(auctionHouseId, 'Updating AH');
  const KV_KEY = KEYS.tsmAHRecentlyFetched(auctionHouseId);

  const { db, client } = createDbClient();
  const getAuctionHousePromise = queue.get(auctionHouseId);

  let ahItems: Item[] | undefined;

  // Check if AH is already being fetched
  if (getAuctionHousePromise) {
    console.info(auctionHouseId, 'Waiting for AH in queue to resolve...');
    ahItems = await getAuctionHousePromise;
  } else {
    // Check if AH has already been fetched
    if (await kv.get(KV_KEY)) {
      return;
    }

    // Add to queue
    console.info(auctionHouseId, 'Adding AH to queue...');
    const tsmApiKey = tsmApiKeys[version];
    queue.set(
      auctionHouseId,
      getAuctionHouse(auctionHouseId, tsmApiKey)
        .then((items) => {
          console.info(auctionHouseId, 'AH fetched!');
          return items;
        })
        .catch((err) => {
          console.error(auctionHouseId, 'Error fetching AH', err.message);
          return undefined;
        })
        .finally(async () => {
          // Remove from queue
          queue.delete(auctionHouseId);
          await kv.set(KV_KEY, new Date().toISOString(), { EX: 60 * 60 * 6, NX: true });
        }),
    );

    // Wait for this AH ID to be fetched
    console.info(auctionHouseId, 'Fetching AH...');
    ahItems = await queue.get(auctionHouseId);
  }

  if (!ahItems) {
    console.error(auctionHouseId, 'No items found for AH!');
    return;
  }

  try {
    const chunks = R.chunk(ahItems, 2000);

    for await (const chunk of chunks) {
      await db.insert(items).values(
        chunk.map((item) => ({
          auctionHouseId: Number(auctionHouseId),
          itemId: item.itemId,
          numAuctions: item.numAuctions,
          marketValue: item.marketValue,
          historical: item.historical,
          minBuyout: item.minBuyout.toString(),
          quantity: item.quantity,
        })),
      );
    }

    return ahItems;
  } catch (err: any) {
    console.error(err.message);
  } finally {
    console.info(auctionHouseId, 'closing db connection');
    client.end();
  }
}
