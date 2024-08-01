'use client';

import * as React from 'react';
import { ResponsiveLine } from '@nivo/line';
import dayjs from 'dayjs';

import { CoinValue } from 'common/coin-value';

import { PriceChart } from './price-chart';

type Props = {
  itemHistory: {
    minBuyout: number;
    quantity: number;
    marketValue: number;
    historical: number;
    numAuctions: number;
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
      <PriceChart
        data={itemHistory.map((item) => ({
          x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
          y: item.historical,
        }))}
        dataId="historical"
        title={
          <div>
            Historical <span className="font-bold ml-1">{itemHistory.at(-1)!.historical}</span>
          </div>
        }
      />
      <PriceChart
        data={[]}
        dataId="quantity"
        title={
          <div>
            Quantity <span className="font-bold ml-1">{itemHistory.at(-1)!.quantity}</span>
          </div>
        }
      >
        <ResponsiveLine
          data={[
            {
              id: 'Quantity',
              data: itemHistory.map((item) => ({
                x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
                y: item.quantity,
              })),
            },
          ]}
          margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
          xScale={{
            type: 'point',
          }}
          yScale={{
            type: 'linear',
            min: 0,
            max: 'auto',
          }}
          curve="linear"
          axisBottom={{
            tickSize: 1,
            tickPadding: 16,
          }}
          axisLeft={{
            tickSize: 0,
            tickValues: 5,
            tickPadding: 16,
          }}
          colors={['#FFD700']}
          pointSize={6}
          useMesh={true}
          gridYValues={6}
          theme={{
            tooltip: {
              chip: {
                borderRadius: '9999px',
                color: '#000',
              },
              container: {
                fontSize: '12px',
                textTransform: 'capitalize',
                borderRadius: '6px',
                background: '#000',
                color: '#FFF',
                border: '1px solid #848484',
              },
            },
            grid: {
              line: {
                stroke: '#585858',
              },
            },
            axis: {
              ticks: {
                text: {
                  fill: '#828282',
                },
              },
            },
            crosshair: {
              line: {
                stroke: '#FFF',
              },
            },
          }}
          role="application"
          enableArea
        />
      </PriceChart>
    </div>
  );
};
