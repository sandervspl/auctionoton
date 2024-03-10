import type * as React from 'react';

import { convertToCoins } from 'services/utils';

export type Props = {
  value: string | number;
  amount?: number;
  text?: boolean;
};

export const CoinValue: React.FC<Props> = (props) => {
  const getValueStrings = (): string | JSX.Element[] => {
    if (typeof props.value === 'string') {
      return props.value;
    }

    const raw = Number(props.value);
    const amount = props.amount ?? 1;
    const coins = convertToCoins(raw * amount);
    const coinComponents: JSX.Element[] = [];

    if (typeof coins === 'string' || raw === 0) {
      return 'N/A';
    }

    let coin: keyof typeof coins;
    for (coin in coins) {
      const coinOrderIndex = ['gold', 'silver', 'copper'].indexOf(coin);

      if (coins[coin] > 0) {
        coinComponents[coinOrderIndex] = (
          <span key={coin} className={`money${coin}`}>
            {coins[coin]}
          </span>
        );
      }
    }

    return coinComponents.filter(Boolean);
  };

  const getValueAsText = () => {
    const raw = Number(props.value);
    const amount = props.amount ?? 1;
    const coins = convertToCoins(raw * amount);
    const coinComponents: string[] = [];

    if (typeof coins === 'string' || raw === 0) {
      return 'N/A';
    }

    let coin: keyof typeof coins;
    for (coin in coins) {
      const coinOrderIndex = ['gold', 'silver', 'copper'].indexOf(coin);

      if (coins[coin] > 0) {
        coinComponents[coinOrderIndex] = `${coins[coin]} ${coin}`;
      }
    }

    return coinComponents.filter(Boolean).join(' ');
  };

  if (props.text) {
    return getValueAsText();
  }

  const value = getValueStrings();

  if (typeof value === 'string' || value.length > 0) {
    return <span className="flex gap-1">{value}</span>;
  }

  return <span className="text-gray-300">N/A</span>;
};
