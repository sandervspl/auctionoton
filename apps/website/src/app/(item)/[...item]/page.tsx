import * as i from 'types';
import { Metadata } from 'next';
import Image from 'next/image';
import { and, eq, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ActivityIcon } from 'lucide-react';
import dayjs from 'dayjs';

import { db } from 'db';
import { items, itemsMetadata } from 'db/schema';
import { Card, CardHeader, CardTitle, CardContent } from 'shadcn-ui/card';
import { CurvedlineChart } from 'modules/item-detail/charts';
import { getAuctionHouseIds, seasonalRealmsEU, seasonalRealmsUS } from 'services/realms';

type Props = i.NextPageProps<{
  params: {
    item: ItemParam;
  };
}>;

export type ItemParam = [realmSlug: string, region: string, faction: string, itemSlug: string];

export const metadata: Metadata = {
  title: 'Home',
};

const Page = async ({ params }: Props) => {
  const [realmSlug, region, faction, itemSlug] = params.item;
  const auctionHouseId = {
    eu: getAuctionHouseIds(seasonalRealmsEU),
    us: getAuctionHouseIds(seasonalRealmsUS),
  }[region!]?.[realmSlug!]?.[faction!];

  if (auctionHouseId == null) {
    console.log('AH not found');
    notFound();
  }

  const itemHistory = await db
    .select({
      minBuyout: items.minBuyout,
      quantity: items.quantity,
      marketValue: items.marketValue,
      historical: items.historical,
      numAuctions: items.numAuctions,
      timestamp: items.timestamp,
      icon: itemsMetadata.icon,
      name: itemsMetadata.name,
      quality: itemsMetadata.quality,
    })
    .from(items)
    .where(and(eq(itemsMetadata.slug, itemSlug!), eq(items.auctionHouseId, auctionHouseId)))
    .leftJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
    .orderBy(asc(items.timestamp));

  if (itemHistory.length === 0) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <div className="flex gap-2 items-center">
        <Image
          src={itemHistory[0]!.icon!}
          alt={itemHistory[0]!.name!}
          width={40}
          height={40}
          className="rounded-lg overflow-hidden bg-black"
          priority
        />

        <div className="flex flex-col justify-start">
          <h1 className="font-bold text-2xl">{itemHistory[0]?.name}</h1>
          <p className="text-sm">
            <span className="capitalize">{realmSlug?.replaceAll('-', ' ')}</span> (
            {region?.toUpperCase()}) <span className="capitalize">- {faction}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Min Buyout</CardTitle>
            <ActivityIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <CurvedlineChart
              className="w-full aspect-[2/1]"
              data={itemHistory.map((item) => ({
                x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
                y: item.minBuyout,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Market Value</CardTitle>
            <ActivityIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <CurvedlineChart
              className="w-full aspect-[2/1]"
              data={itemHistory.map((item) => ({
                x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
                y: item.marketValue,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Historical Value</CardTitle>
            <ActivityIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <CurvedlineChart
              className="w-full aspect-[2/1]"
              data={itemHistory.map((item) => ({
                x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
                y: item.historical,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Quantity</CardTitle>
            <ActivityIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <CurvedlineChart
              className="w-full aspect-[2/1]"
              data={itemHistory.map((item) => ({
                x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
                y: item.quantity,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Page;
