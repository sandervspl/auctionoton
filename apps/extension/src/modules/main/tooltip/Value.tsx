import * as i from 'types';
import React from 'react';

import { convertToGSCv2 } from '@project/utils';

export type Props = {
  amount?: number;
  value: string | i.PriceObjectV2;
};

export const Value: React.FC<Props> = (props) => {
  const getValueStrings = (): string | JSX.Element[] => {
    if (typeof props.value === 'string') {
      return props.value;
    }

    const amount = props.amount ?? 1;
    const coins = convertToGSCv2(props.value.raw * amount);
    const coinComponents: JSX.Element[] = [];

    if (typeof coins === 'string' || Number(props.value.raw) === 0) {
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
    return <span className="auc-flex auc-gap-1">{value}</span>;
  }

  return <span className="auc-text-gray-300">N/A</span>;
};
