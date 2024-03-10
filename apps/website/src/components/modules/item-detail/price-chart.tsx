'use client';

import * as React from 'react';
import dayjs from 'dayjs';
import { ActivityIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from 'shadcn-ui/card';
import { CurvedlineChart } from './charts';

type Props = {
  data: { x: string; y: number }[];
};

export const PriceChart = (props: Props) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">Min Buyout</CardTitle>
        <ActivityIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <CurvedlineChart className="w-full aspect-[2/1]" data={props.data} />
      </CardContent>
    </Card>
  );
};
