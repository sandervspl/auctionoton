'use client';

import * as React from 'react';
import dayjs from 'dayjs';

import { CoinValue } from 'common/coin-value';

import { PriceChart } from './price-chart';

type Props = {
  itemHistory: {
    minBuyout: number;
    marketValue: number;
    historical: number;
    timestamp: Date | null;
    icon: string | null;
    name: string | null;
    quality: number | null;
  }[];
};

export const ItemCharts = ({ itemHistory }: Props) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PriceChart
        data={itemHistory.map((item) => ({
          x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
          y: item.minBuyout,
        }))}
        dataId="min-buyout"
        title={
          <div className="flex items-center gap-2">
            Min Buyout <CoinValue value={itemHistory.at(-1)!.minBuyout} />
          </div>
        }
      />
      <PriceChart
        data={itemHistory.map((item) => ({
          x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
          y: item.marketValue,
        }))}
        dataId="market-value"
        title={
          <div className="flex items-center gap-2">
            Market Value <CoinValue value={itemHistory.at(-1)!.marketValue} />
          </div>
        }
      />
    </div>
  );
};
