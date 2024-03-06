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
	const itemresult = await db
		.select()
		.from(items)
		.where(and(eq(items.itemId, 3356), eq(items.auctionHouseId, 513)))
		.leftJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
		.orderBy(desc(items.timestamp))
		.limit(1);

	const item = itemresult[0];

	return (
		<main>
			<section className="grid place-items-center px-2">
				<button
					type="button"
					className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-600 bg-gray-100 px-4 py-3 font-bold shadow-lg"
				>
					Auctionoton
				</button>

				{/* Item auction house stats */}
				<div>
					<h2 className="text-2xl font-bold">Auction House Stats</h2>
					<p>Items: 1,000</p>
					<p>Gold: 1,000,000</p>
					<p>Silver: 1,000,000</p>
					<p>Copper: 1,000,000</p>
				</div>

				{/* Items */}
				<div>
					<h2 className="text-2xl font-bold">Items</h2>
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
							{item && (
								<tr>
									<td>{item.items_metadata?.name}</td>
									<td>{item.items.auctionHouseId}</td>
									<td>{item.items.minBuyout}</td>
									<td>{item.items.quantity}</td>
									<td>{item.items.marketValue}</td>
									<td>{item.items.historical}</td>
									<td>{item.items.numAuctions}</td>
									<td>{item.items.timestamp?.toISOString()}</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>
		</main>
	);
};

export default Page;
