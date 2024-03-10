import type * as i from 'types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActivityIcon } from 'lucide-react';
import dayjs from 'dayjs';

import { Card, CardHeader, CardTitle, CardContent } from 'shadcn-ui/card';
import { CurvedlineChart } from 'modules/item-detail/charts';
import { getItemHistory } from 'queries/items';
import { getAuctionHouseId } from 'queries/auction-house';

type Props = i.NextPageProps<{
  params: {
    item: ItemParam;
  };
  searchParams: {
    faction?: string;
  };
}>;

export type ItemParam = [realmSlug: string, region: string, faction: string, itemSlug: string];

export const metadata: Metadata = {
  title: 'Home',
};

export const revalidate = 300;

const Page = async (props: Props) => {
  const [realmSlug, region, faction, itemSlug] = props.params.item;

  const auctionHouseId = getAuctionHouseId(region!, realmSlug!, faction!);
  if (auctionHouseId == null) {
    notFound();
  }

  const itemHistory = await getItemHistory(itemSlug!, auctionHouseId!);
  if (itemHistory.length === 0) {
    notFound();
  }

  return (
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
  );
};

export default Page;
