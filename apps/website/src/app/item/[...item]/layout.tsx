import type * as React from 'react';
import { $path } from 'next-typesafe-url';
import { notFound } from 'next/navigation';

import { getItemHistory } from 'queries/items';
import { getAuctionHouseId } from 'services/auction-house';
import { getTextQualityColor } from 'services/colors';
import { FactionButtons } from 'common/faction-buttons';
import { ItemImage } from 'common/item-image';

import type { ItemParam } from './page';

type Props = {
  children: React.ReactNode;
  params: {
    item: ItemParam;
  };
};

export default async function Layout(props: Props) {
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
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <header className="flex flex-col gap-6">
        <div className="flex gap-2 items-center">
          <ItemImage item={itemHistory[0]!} width={40} height={40} />

          <div className="flex flex-col justify-start">
            <h1
              className="font-bold text-2xl"
              style={{
                ...getTextQualityColor(itemHistory[0]?.quality),
              }}
            >
              {itemHistory[0]?.name}
            </h1>
            <p className="text-sm">
              <span className="capitalize">{realmSlug?.replaceAll('-', ' ')}</span> (
              {region?.toUpperCase()}) <span className="capitalize">- {faction}</span>
            </p>
          </div>
        </div>

        <FactionButtons
          href={{
            a: $path({
              route: '/item/[...item]',
              routeParams: { item: [realmSlug!, region!, 'alliance', itemSlug] },
            }),
            h: $path({
              route: '/item/[...item]',
              routeParams: { item: [realmSlug!, region!, 'horde', itemSlug] },
            }),
          }}
        />
      </header>
      {props.children}
    </main>
  );
}
