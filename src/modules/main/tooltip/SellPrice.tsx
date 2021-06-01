import * as i from 'types';
import React from 'react';
import { css } from '@emotion/css';

import { Value } from './Value';


export const SellPrice: React.FC<Props> = (props) => {
  const isValueObject = typeof props.value !== 'string';
  const isMultiple = isValueObject && props.amount && props.amount > 1;

  return (
    <span className={'whtt-sellprice ' + css`
      display: flex;
      justify-content: space-between;
    `}>
      <span className={css`
        width: 170px;
      `}>
        {props.heading}{isMultiple && ` (x${props.amount})`}
      </span>
      <Value value={props.value} />
    </span>
  );
};

export type Props = {
  heading: string;
  amount?: number;
  value: string | i.ValueObject;
};
