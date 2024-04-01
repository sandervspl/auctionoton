import * as R from 'remeda';

import { getAuctionHouse } from '../../utils/tsm';
import { db } from '../../db';
import { items } from '../../db/schema';

export async function updateAuctionHouseData(auctionHouseId: string | number) {
  const ahItems = await getAuctionHouse(Number(auctionHouseId));

  if (!ahItems) {
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
  } catch (err: any) {
    console.error(err.message);
  }
}
