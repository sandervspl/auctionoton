import * as i from 'types';
import React from 'react';


export const Value: React.FC<Props> = (props) => {
  const getValueStrings = (): JSX.Element[] => {
    const values: JSX.Element[] = [];
    let coin: keyof i.ValueObject;

    for (coin in props.value) {
      const coinValue = props.value[coin];

      const style: React.CSSProperties = {};
      const coinIndex = ['gold', 'silver', 'copper'].indexOf(coin);

      if (coin !== 'copper') {
        style.marginRight = 5;
      }

      values[coinIndex] =
        <span key={coin} className={`money${coin}`} style={style}>
          {coinValue}
        </span>;
    }

    return values.filter(Boolean);
  };

  const values = getValueStrings();

  return values.length > 0
    ? <span>{values}</span>
    : <span style={{ color: '#b9b9b9' }}>N/A</span>;
};

export type Props = {
  value: i.ValueObject;
};
