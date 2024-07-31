import type * as i from 'types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getItemWithId, getItemFromSlug, getItemHistory } from 'queries/items';
import { getAuctionHouseId } from 'queries/auction-house';
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

export const revalidate = 300;

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const itemSlug = params.item[3];
  const itemId = itemSlug.split('-').pop();
  const item = await getItemWithId(itemId!);

  return {
    title: item?.name,
  };
};

const Page = async (props: Props) => {
  const [realmSlug, region, faction, itemSlug] = props.params.item;

  const itemId = itemSlug!.split('-').pop();
  if (!itemId) {
    notFound();
  }

  const auctionHouseId = getAuctionHouseId(region!, realmSlug!, faction!);
  if (auctionHouseId == null) {
    notFound();
  }

  const itemHistory = await getItemHistory(itemId, auctionHouseId);
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
