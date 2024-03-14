import type * as i from 'types';
import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import dayjs from 'dayjs';

import { getItemHistory } from 'queries/items';
import { getAuctionHouseId } from 'queries/auction-house';
import { PriceChart } from 'modules/item-detail/price-chart';
import { ResponsiveLine } from '@nivo/line';
import { ItemCharts } from 'modules/item-detail/item-charts';
import { db } from 'db';

type Props = i.NextPageProps<{
  params: {
    item: ItemParam;
  };
  searchParams: {
    faction?: string;
  };
}>;

export type ItemParam = [realmSlug: string, region: string, faction: string, itemSlug: string];

export const generateMetadata = async (
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> => {
  const [, , , itemSlug] = params.item;

  const item = await db.query.itemsMetadata.findFirst({
    where: (itemsMetadata, { eq }) => eq(itemsMetadata.slug, itemSlug!),
    columns: { name: true },
  });

  return {
    title: item?.name,
  };
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
