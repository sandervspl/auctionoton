import * as i from 'types';
import React from 'react';

import { Value } from './Value';


export const SellPrice: React.FC<Props> = (props) => {
  const isValueObject = typeof props.value !== 'string';
  const isMultiple = isValueObject && props.amount && props.amount > 1;

  return (
    <span className="whtt-sellprice auc-flex auc-justify-between auc-gap-10">
      <span>
        {props.heading}{isMultiple && ` (x${props.amount})`}
      </span>
      <Value value={props.value} amount={props.amount} />
    </span>
  );
};

export type Props = {
  heading: string;
  amount?: number;
  value: string | i.PriceObjectV2;
};
