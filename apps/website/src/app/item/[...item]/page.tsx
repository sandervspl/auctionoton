import type * as i from 'types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActivityIcon } from 'lucide-react';
import dayjs from 'dayjs';

import { Card, CardHeader, CardTitle, CardContent } from 'shadcn-ui/card';
import { CurvedlineChart } from 'modules/item-detail/charts';
import { getItemHistory } from 'queries/items';
import { getAuctionHouseId } from 'queries/auction-house';
import { PriceChart } from 'modules/item-detail/price-chart';

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
      <PriceChart
        data={itemHistory.map((item) => ({
          x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
          y: item.minBuyout,
        }))}
      />
      <PriceChart
        data={itemHistory.map((item) => ({
          x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
          y: item.marketValue,
        }))}
      />
      <PriceChart
        data={itemHistory.map((item) => ({
          x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
          y: item.historical,
        }))}
      />
      <PriceChart
        data={itemHistory.map((item) => ({
          x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
          y: item.quantity,
        }))}
      />
    </div>
  );
};

export default Page;
