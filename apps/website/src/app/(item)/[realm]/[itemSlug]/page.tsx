import * as i from 'types';
import * as React from 'react';
import { Metadata } from 'next';
import Image from 'next/image';
import { and, eq, desc, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ActivityIcon, CreditCardIcon, SearchIcon } from 'lucide-react';

import { db } from 'db';
import { items, itemsMetadata } from 'db/schema';
import { Input } from 'shadcn-ui/input';
import { Card, CardHeader, CardTitle, CardContent } from 'shadcn-ui/card';
import { Button } from 'shadcn-ui/button';
import { CurvedlineChart } from 'components/item-detail/charts';
import { RowList } from 'postgres';

type Props = i.NextPageProps<{
  params: {
    itemSlug: string;
    realm: string;
    faction: 'alliance' | 'horde';
  };
}>;

export const metadata: Metadata = {
  title: 'Home',
};

const Page = async ({ params }: Props) => {
  const itemSlug = params.itemSlug as string;
  const [realmSlug, faction, region] = (params.realm as string).split('-');
  const auctionHouseId = {
    eu: {
      living_flame: { alliance: 513 },
    },
  }[region!]?.[realmSlug!]?.[faction!];

  if (auctionHouseId == null) {
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
    .where(and(eq(itemsMetadata.slug, itemSlug), eq(items.auctionHouseId, auctionHouseId)))
    .leftJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
    .orderBy(desc(items.timestamp));

  if (itemHistory.length === 0) {
    notFound();
  }

  async function search(formdata: FormData) {
    'use server';

    const search = formdata.get('search') as string;

    const results = await db
      .select({
        id: itemsMetadata.id,
        name: itemsMetadata.name,
        slug: itemsMetadata.slug,
        quality: itemsMetadata.quality,
      })
      .from(itemsMetadata)
      .where(sql`similarity(name, ${search}) > 0.3`)
      .orderBy(sql`similarity(name, ${search}) DESC`)
      .limit(10);

    console.log(results);

    return results;
  }

  return (
    <div className="flex flex-col w-full min-h-screen">
      <header className="flex items-center h-16 px-4 border-b shrink-0 md:px-6">
        <form className="flex-1 ml-4 md:ml-6" action={search}>
          <div className="relative w-full max-w-md flex gap-4">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input className="pl-8" placeholder="Search item..." type="search" name="search" />
            <Button type="submit">Search</Button>
          </div>
        </form>
      </header>

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
          <h1 className="font-bold text-2xl">{itemHistory[0]?.name}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Min Buyout</CardTitle>
              <CreditCardIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <CurvedlineChart
                className="w-full aspect-[2/1]"
                data={itemHistory.map((item) => ({
                  x: item.timestamp as any,
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
                  x: item.timestamp as any,
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
                  x: item.timestamp as any,
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
                  x: item.timestamp as any,
                  y: item.quantity,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Page;
