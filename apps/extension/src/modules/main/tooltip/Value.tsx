import * as i from 'types';
import React from 'react';

import { convertToGSCv2 } from '@project/utils';


export const Value: React.FC<Props> = (props) => {
  const getValueStrings = (): string | JSX.Element[] => {
    const amount = props.amount ?? 1;
    const value = typeof props.value === 'number' ? props.value : props.value.raw;
    const coins = convertToGSCv2(value * amount);
    const coinComponents: JSX.Element[] = [];

    if (typeof coins === 'string') {
      return 'N/A';
    }

    let coin: keyof typeof coins;
    for (coin in coins) {
      const coinOrderIndex = ['gold', 'silver', 'copper'].indexOf(coin);
      coinComponents[coinOrderIndex] = (
        <span key={coin} className={`money${coin}`}>
          {coins[coin]}
        </span>
      );
    }

    return coinComponents.filter(Boolean);
  };

  const value = getValueStrings();

  if (typeof value === 'string' || value.length > 0) {
    return <span className="flex gap-1 items-start">{value}</span>;
  }

  return (
    <span className="text-gray-300">N/A</span>
  );
};

export type Props = {
  amount?: number;
  value: number | i.PriceObjectV2;
};
