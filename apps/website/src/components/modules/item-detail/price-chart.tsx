'use client';

import type * as React from 'react';
import { ResponsiveLine, type LineSvgProps } from '@nivo/line';
import { ActivityIcon } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from 'shadcn-ui/card';
import { CoinValue } from 'common/coin-value';

type Props = {
  data: { x: string; y: number }[];
  title: string;
  lineProps?: Omit<LineSvgProps, 'data'>;
  children?: React.ReactNode;
};

export const PriceChart = ({ lineProps, ...props }: Props) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{props.title}</CardTitle>
        <ActivityIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        {/* <CurvedlineChart className="w-full aspect-[2/1]" data={props.data} lineProps={lineProps} /> */}
        <div className="w-full aspect-[2/1]">
          {props.children ?? (
            <ResponsiveLine
              data={[
                {
                  id: props.title,
                  data: props.data,
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
              //@ts-ignore
              yFormat={(value) => <CoinValue value={value as number} />}
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
              {...lineProps}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
