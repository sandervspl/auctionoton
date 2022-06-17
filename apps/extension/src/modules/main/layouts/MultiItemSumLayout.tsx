import type * as i from 'types';
import * as React from 'react';

import { Value } from '../tooltip/Value';
import ServerName from './components/ServerName';

const MultiItemSumLayout: React.VFC<Props> = (props) => {
  const [combinedItems, setCombinedItems] = React.useState<CombinedItem[]>([]);

  React.useEffect(() => {
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
  }, [props.items?.length, props.reagents.length]);

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
              <div className="mt-4" />
              <div className="mt-4 font-bold">Total</div>
              <div className="mt-4">
                <Value
                  value={combinedItems.reduce((prev, item) => prev + item.fullPrice, 0)}
                />
              </div>
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
  items?: i.MultiItemDataClassicResponse | i.CachedItemDataClassic[];
};

type CombinedItem = (i.ItemDataClassicResponse | i.CachedItemDataClassic) & {
  fullPrice: number;
  amount: number;
  name?: string;
  className?: string;
};

export default MultiItemSumLayout;
