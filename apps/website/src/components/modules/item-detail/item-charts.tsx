'use client';

import * as React from 'react';
import { ResponsiveLine } from '@nivo/line';
import dayjs from 'dayjs';

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
        title="Min Buyout"
      />
      <PriceChart
        data={itemHistory.map((item) => ({
          x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
          y: item.marketValue,
        }))}
        title="Market Value"
      />
      <PriceChart
        data={itemHistory.map((item) => ({
          x: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm'),
          y: item.historical,
        }))}
        title="Historical"
      />
      <PriceChart data={[]} title="Quantity">
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
