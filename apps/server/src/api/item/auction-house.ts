import * as R from 'remeda';
import { sql } from 'drizzle-orm';

import { getAuctionHouse } from '../../utils/tsm';
import { db } from '../../db';
import { items } from '../../db/schema';

export async function updateAuctionHouseData(auctionHouseId: string | number) {
  const ahItems = await getAuctionHouse(Number(auctionHouseId));

  if (ahItems) {
    try {
      const chunks = R.chunk(ahItems, 2000);

      for await (const chunk of chunks) {
        await db
          .insert(items)
          .values(
            chunk.map((item) => ({
              auctionHouseId: Number(auctionHouseId),
              itemId: item.itemId,
              numAuctions: item.numAuctions,
              marketValue: item.marketValue,
              historical: item.historical,
              minBuyout: item.minBuyout,
              quantity: item.quantity,
              timestamp: new Date().toISOString(),
            })),
          )
          .onConflictDoUpdate({
            target: [items.itemId, items.auctionHouseId],
            set: {
              numAuctions: sql`excluded.num_auctions`,
              marketValue: sql`excluded.market_value`,
              historical: sql`excluded.historical`,
              minBuyout: sql`excluded.min_buyout`,
              quantity: sql`excluded.quantity`,
              timestamp: new Date().toISOString(),
            },
          });
      }
    } catch (err: any) {
      console.error(err.message);
    }
  }
}
