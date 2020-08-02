import React from 'react';
import * as i from '../types';

export const Value: React.FC<Props> = (props) => {
  const [values, setValues] = React.useState<JSX.Element[]>([]);

  React.useEffect(() => {
    const arr: JSX.Element[] = [];
    const style: React.CSSProperties = {};

    if (props.value.gold > 0) {
      if (props.value.silver > 0 || props.value.copper > 0) {
        style.marginRight = 5;
      }

      arr.push(<span key="gold" className="moneygold" style={style}>{props.value.gold}</span>);
    }

    if (props.value.silver > 0) {
      if (props.value.copper > 0) {
        style.marginRight = 5;
      }

      arr.push(<span key="silver" className="moneysilver" style={style}>{props.value.silver}</span>);
    }

    if (props.value.copper > 0) {
      arr.push(<span key="copper" className="moneycopper">{props.value.copper}</span>);
    }

    setValues(arr);
  }, []);

  return values.length > 0
    ? <span>{values}</span>
    : <span style={{ color: '#b9b9b9' }}>N/A</span>;
};

export type Props = {
  value: i.ValueObject;
};
