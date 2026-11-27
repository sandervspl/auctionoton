import { ResponsiveLine } from '@nivo/line';
import dayjs from 'dayjs';
import { ActivityIcon } from 'lucide-react';
import type * as React from 'react';

import { CoinValue } from 'common/coin-value';
import { Card, CardContent, CardHeader, CardTitle } from 'shadcn-ui/card';

type PricePoint = { x: string; y: number };

const MAX_X_TICKS = 7;

/** Evenly spaced subset of the x values so date labels never overlap. */
function xTickValues(data: PricePoint[]) {
  if (data.length <= MAX_X_TICKS) return data.map((point) => point.x);
  const step = (data.length - 1) / (MAX_X_TICKS - 1);
  return Array.from({ length: MAX_X_TICKS }, (_, i) => data[Math.round(i * step)]!.x);
}

/** Compact coin label for the y axis, e.g. 12g, 45s or 80c. */
function formatCoinTick(copper: number) {
  if (copper >= 10_000) return `${Number((copper / 10_000).toFixed(1))}g`;
  if (copper >= 100) return `${Number((copper / 100).toFixed(1))}s`;
  return `${copper}c`;
}

type Props = {
  data: PricePoint[];
  dataId: string;
  title: React.ReactNode;
};

/** Days covered by the series, used to pick tick labels and point density. */
function spanDays(data: PricePoint[]) {
  if (data.length < 2) return 0;
  return dayjs(data.at(-1)!.x).diff(dayjs(data[0]!.x), 'day');
}

export const PriceChart = ({ data, dataId, title }: Props) => {
  const longRange = spanDays(data) > 120;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <ActivityIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <div className="w-full aspect-2/1">
          <ResponsiveLine
            data={[{ id: dataId, data }]}
            margin={{ top: 10, right: 24, bottom: 40, left: 48 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 0, max: 'auto' }}
            curve="linear"
            axisBottom={{
              tickSize: 1,
              tickPadding: 16,
              tickValues: xTickValues(data),
              format: (value) => dayjs(value).format(longRange ? 'MMM YYYY' : 'MMM D'),
            }}
            axisLeft={{
              tickSize: 0,
              tickValues: 5,
              tickPadding: 16,
              format: (value) => formatCoinTick(Number(value)),
            }}
            colors={['#FFD700']}
            pointSize={data.length > 60 ? 0 : 6}
            useMesh
            gridYValues={6}
            tooltip={({ point }) => (
              <div className="flex items-center gap-2 whitespace-nowrap rounded-md border border-[#848484] bg-black px-2.5 py-1.5 text-xs text-white">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: point.seriesColor }}
                />
                <span>{point.data.x}</span>
                <strong>
                  <CoinValue value={point.data.y} />
                </strong>
              </div>
            )}
            theme={{
              grid: { line: { stroke: '#585858' } },
              axis: { ticks: { text: { fill: '#828282' } } },
              crosshair: { line: { stroke: '#FFF' } },
            }}
            role="application"
          />
        </div>
      </CardContent>
    </Card>
  );
};
