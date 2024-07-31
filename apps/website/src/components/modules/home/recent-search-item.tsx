'use client';

import { $path } from 'next-typesafe-url';
import Link from 'next/link';

import { CoinValue } from 'common/coin-value';
import { Card, CardHeader, CardContent } from 'shadcn-ui/card';
import { useSettings } from 'hooks/use-settings';
import { MoveDownRightIcon, MoveUpRightIcon } from 'lucide-react';
import { cn } from 'services/cn';
import { getTextQualityColor } from 'services/colors';
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
    minBuyout?: number | undefined;
    marketValue?: number | undefined;
    diffMinBuyout?: number | undefined;
    diffMarketValue?: number | undefined;
    lastUpdated?: Date | null | undefined;
  };
};

export const RecentSearchItem = (props: Props) => {
  const { settings } = useSettings();

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
            <CoinValue value={props.item.minBuyout!} />

            <div
              className={cn('flex items-center gap-1 text-green-400', {
                'text-red-400': props.item.diffMarketValue! < 0,
              })}
            >
              {props.item.diffMarketValue! > 0 ? (
                <MoveUpRightIcon size={18} />
              ) : props.item.diffMarketValue! < 0 ? (
                <MoveDownRightIcon size={18} />
              ) : null}
              <small className="text-xs">
                {((props.item.diffMarketValue! / props.item.marketValue!) * 100).toFixed(2)}%
              </small>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};
