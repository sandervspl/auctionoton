import type * as i from 'types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import dayjs from 'dayjs';

import { getItemHistory } from 'queries/items';
import { getAuctionHouseId } from 'queries/auction-house';
import { PriceChart } from 'modules/item-detail/price-chart';
import { ResponsiveLine } from '@nivo/line';
import { ItemCharts } from 'modules/item-detail/item-charts';

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
    <>
      <ItemCharts itemHistory={itemHistory} />
    </>
  );
};

export default Page;
