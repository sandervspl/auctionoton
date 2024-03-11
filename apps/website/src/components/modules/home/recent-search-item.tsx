'use client';

import * as React from 'react';
import { $path } from 'next-typesafe-url';
import Link from 'next/link';
import Image from 'next/image';

import { CoinValue } from 'common/coin-value';
import { Card, CardHeader, CardContent } from 'shadcn-ui/card';
import { useSettings } from 'hooks/use-settings';
import { MoveDownRightIcon, MoveUpRightIcon } from 'lucide-react';
import { cn } from 'services/cn';

type Props = {
  item: {
    itemId: number;
    id: number;
    search: string;
    name: string | null;
    slug: string | null;
    icon: string | null;
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
    <Card key={props.item.id}>
      <Link
        href={$path({
          route: '/item/[...item]',
          routeParams: {
            item: [settings.realm, settings.region, settings.faction, props.item.slug!],
          },
        })}
      >
        <CardHeader className="flex flex-row items-center pb-2 gap-2">
          <Image
            src={props.item.icon ?? '/images/questionmark.webp'}
            alt={props.item.name!}
            className="h-6 w-6 rounded-md"
            width={24}
            height={24}
            onError={(e) => {
              (e.target as any).src = '/images/questionmark.webp';
              (e.target as any).removeAttribute('srcset');
            }}
          />
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
