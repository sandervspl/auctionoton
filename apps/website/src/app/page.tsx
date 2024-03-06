import * as i from 'types';
import * as React from 'react';
import { Metadata } from 'next';

import { db } from 'src/db';
import { items, itemsMetadata } from 'src/db/schema';
import { and, eq, desc } from 'drizzle-orm';

type Props = i.NextPageProps;

export const metadata: Metadata = {
  title: 'Home',
};

const Page: React.FC<Props> = async () => {
  const itemHistory = await db
    .select()
    .from(items)
    .where(and(eq(items.itemId, 3356), eq(items.auctionHouseId, 513)))
    .leftJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
    .orderBy(desc(items.timestamp));

  return (
    <main>
      <section className="grid place-items-center px-2">
        <div>
          <table className="table-auto">
            <thead>
              <tr>
                <th>Item</th>
                <th>Auction House</th>
                <th>Min Buyout</th>
                <th>Quantity</th>
                <th>Market Value</th>
                <th>Historical Value</th>
                <th>Num Auctions</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {itemHistory?.map((item) => (
                <tr key={item.items.id}>
                  <td>{item.items_metadata?.name}</td>
                  <td>{item.items.auctionHouseId}</td>
                  <td>{item.items.minBuyout}</td>
                  <td>{item.items.quantity}</td>
                  <td>{item.items.marketValue}</td>
                  <td>{item.items.historical}</td>
                  <td>{item.items.numAuctions}</td>
                  <td>{item.items.timestamp?.toISOString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default Page;
