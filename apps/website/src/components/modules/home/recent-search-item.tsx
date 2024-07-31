'use client';

import Link from 'next/link';
import { $path } from 'next-typesafe-url';
import { MoveDownRightIcon, MoveUpRightIcon } from 'lucide-react';

import { useSettings } from 'hooks/use-settings';
import { cn } from 'services/cn';
import { getTextQualityColor } from 'services/colors';
import { Card, CardHeader, CardContent } from 'shadcn-ui/card';
import { CoinValue } from 'common/coin-value';
import { ItemImage } from 'common/item-image';

type Props = {
  item: {
    itemId: number;
    id: number;
    search: string;
    name: string | null;
    slug: string | null;
    icon: string | null;
    quality: number | null;
    min_buyout?: number | undefined;
    market_value?: number | undefined;
    diffMinBuyout?: number | undefined;
    diffMarketValue?: number | undefined;
  };
};

export const RecentSearchItem = (props: Props) => {
  const { settings } = useSettings();
  const minBuyoutDiffPrct = (props.item.diffMinBuyout! / props.item.min_buyout!) * 100;

  return (
    <Card key={props.item.id} className="hover:border-white/30">
      <Link
        href={$path({
          route: '/item/[...item]',
          routeParams: {
            item: [
              settings.realm,
              settings.region,
              settings.faction,
              `${props.item.slug}-${props.item.itemId}`,
            ],
          },
        })}
      >
        <CardHeader
          className="flex flex-row items-center pb-2 gap-2"
          style={{
            ...getTextQualityColor(props.item.quality),
          }}
        >
          <ItemImage item={props.item} className="h-6 w-6" width={24} height={24} />
          {props.item.name}
        </CardHeader>

        <CardContent>
          <div className="flex gap-2 items-center">
            <CoinValue value={props.item.min_buyout!} />

            <div
              className={cn('flex items-center gap-1 text-green-400', {
                'text-red-400': props.item.diffMinBuyout! < 0,
              })}
            >
              {props.item.diffMinBuyout! > 0 ? (
                <MoveUpRightIcon size={18} />
              ) : props.item.diffMinBuyout! < 0 ? (
                <MoveDownRightIcon size={18} />
              ) : null}
              <small className="text-xs">
                {Number.isNaN(minBuyoutDiffPrct) ? null : `${minBuyoutDiffPrct.toFixed(2)}%`}
              </small>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};
