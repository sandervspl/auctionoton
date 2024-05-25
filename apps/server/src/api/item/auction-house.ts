import * as R from 'remeda';

import { getAuctionHouse } from '../../utils/tsm';
import { createDbClient } from '../../db';
import { items } from '../../db/schema';
import { Item } from '../../types/tsm';

const queue = new Map<string | number, Promise<Item[] | undefined>>();

export async function updateAuctionHouseData(auctionHouseId: string | number) {
  console.log('Updating AH for:', auctionHouseId);

  const { db, client } = createDbClient();
  const getAuctionHousePromise = queue.get(auctionHouseId);

  let ahItems: Item[] | undefined;

  // Check if AH is already being fetched
  if (getAuctionHousePromise) {
    console.log(`Waiting for AH '${auctionHouseId}' in queue to resolve...`);
    ahItems = await getAuctionHousePromise;
  } else {
    // Add to queue
    console.log(`Adding AH '${auctionHouseId}' fetch to queue...`);

    queue.set(
      auctionHouseId,
      getAuctionHouse(auctionHouseId)
        .then((items) => {
          console.log(`AH '${auctionHouseId}' fetched! Items: ${items?.length ?? 0}`);
          return items;
        })
        .catch((err) => {
          console.error(`Error fetching AH '${auctionHouseId}'`, err.message);
          return undefined;
        })
        .finally(() => {
          // Remove from queue
          console.log(`Removing AH '${auctionHouseId}' from queue...`);
          queue.delete(auctionHouseId);
        }),
    );

    // Wait for this AH ID to be fetched
    console.log(`Fetching AH '${auctionHouseId}'...`);
    ahItems = await queue.get(auctionHouseId);
  }

  if (!ahItems) {
    console.error(`No items found for AH '${auctionHouseId}'!`);
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
          minBuyout: item.minBuyout,
          quantity: item.quantity,
        })),
      );
    }

    return ahItems;
  } catch (err: any) {
    console.error(err.message);
  } finally {
    console.log('2. closing db connection');
    client.end();
  }
}
