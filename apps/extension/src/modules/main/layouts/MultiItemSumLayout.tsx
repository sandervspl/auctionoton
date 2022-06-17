import type * as i from 'types';
import * as React from 'react';

import { Value } from '../tooltip/Value';
import ServerName from './components/ServerName';

const MultiItemSumLayout: React.VFC<Props> = (props) => {
  const [combinedItems, setCombinedItems] = React.useState<CombinedItem[]>([]);

  React.useEffect(() => {
    console.log('MultiItemSumLayout useEffect');

    if (props.items == null) {
      return;
    }

    const combinedItems: CombinedItem[] = props.items.map((item) => {
      const reagent = props.reagents.find((r) => r.id === item.itemId);

      return {
        ...item,
        amount: reagent?.amount ?? 1,
        name: reagent?.name,
        className: reagent?.className,
        fullPrice: (reagent?.amount || 1) * item.stats.current.minimumBuyout.raw,
      };
    });

    setCombinedItems(combinedItems);
  }, [props.items, props.reagents]);

  return (
    <>
      <tr>
        <td>
          <ServerName />
        </td>
      </tr>
      <tr>
        <td className="grid gap-x-2 mt-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="mb-2 font-bold">Item</div>
          <div className="font-bold">Amount</div>
          <div className="font-bold">Price</div>
          {combinedItems.map((item) => {
            return (
              <React.Fragment key={item.itemId}>
                <div
                  className={item.className}
                >
                  {item.name}
                </div>
                <div>{item.amount}</div>
                <Value value={item.stats.current.minimumBuyout} amount={item.amount} />
              </React.Fragment>
            );
          })}
          {combinedItems.length > 0 ? (
            <>
              <div />
              <div className="font-bold">Total</div>
              <Value
                value={combinedItems.reduce((prev, item) => prev + item.fullPrice, 0)}
              />
            </>
          ) : null}
        </td>
      </tr>
    </>
  );
};

export type Props = {
  reagents: {
    name: string;
    className: string;
    amount: number;
    id: number;
  }[];
  items?: i.MultiItemDataClassicResponse;
};

type CombinedItem = i.ItemDataClassicResponse & {
  fullPrice: number;
  amount: number;
  name?: string;
  className?: string;
};

export default MultiItemSumLayout;
