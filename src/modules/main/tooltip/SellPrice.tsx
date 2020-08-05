import * as i from 'types';
import React from 'react';

import { Value } from './Value';


export const SellPrice: React.FC<Props> = (props) => {
  return (
    <div
      className="whtt-sellprice"
      style={{ display: 'flex', justifyContent: 'space-between' }}
    >
      <div style={{ display: 'inline-block', width: '112px' }}>
        {props.heading}:
      </div>
      <Value value={props.value} />
    </div>
  );
};

export type Props = {
  heading: string;
  value: i.ValueObject;
};
