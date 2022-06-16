import * as React from 'react';

import ServerName from './components/ServerName';


const MultiItemSumLayout: React.VFC<Props> = (props) => {


  return (
    <>
      <tr>
        <td>
          <ServerName />
        </td>
      </tr>
      <tr>
        <td className="grid gap-x-2 mt-4" style={{ gridTemplateColumns: '1fr 35px 1fr' }}>
          {props.items.map((item) => (
            <React.Fragment key={item.name}>
              <div className={item.className}>{item.name}</div>
              <div>(3)</div>
              <div>gold</div>
            </React.Fragment>
          ))}
        </td>
      </tr>
    </>
  );
};

export type Props = {
  items: {
    name: string;
    className: string;
  }[];
};

export default MultiItemSumLayout;
