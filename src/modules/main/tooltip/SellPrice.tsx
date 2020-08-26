import * as i from 'types';
import React from 'react';

import { Value } from './Value';


export const SellPrice: React.FC<Props> = (props) => {
  return (
    <div
      className="whtt-sellprice"
      style={{ display: 'flex', justifyContent: 'space-between' }}
    >
      <div style={{ display: 'inline-block', width: '170px' }}>
        {props.heading}{props.amount && props.amount > 1 && ` (${props.amount}x)`}:
      </div>
      <Value value={props.value} />
    </div>
  );
};

export type Props = {
  heading: string;
  amount?: number;
  value: i.ValueObject;
};
