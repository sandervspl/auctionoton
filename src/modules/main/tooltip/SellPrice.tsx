import * as i from 'types';
import React from 'react';

import { Value } from './Value';


export const SellPrice: React.FC<Props> = (props) => {
  const isValueObject = typeof props.value !== 'string';
  const isMultiple = isValueObject && props.amount && props.amount > 1;

  return (
    <div
      className="whtt-sellprice"
      style={{ display: 'flex', justifyContent: 'space-between' }}
    >
      <div style={{ display: 'inline-block', width: '170px' }}>
        {props.heading}{isMultiple && ` (${props.amount}x)`}:
      </div>
      <Value value={props.value} />
    </div>
  );
};

export type Props = {
  heading: string;
  amount?: number;
  value: string | i.ValueObject;
};
