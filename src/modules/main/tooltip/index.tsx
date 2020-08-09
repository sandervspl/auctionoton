import * as i from 'types';
import React from 'react';

import LoadingSvg from 'static/loading.svg';
import { useStorage } from 'state/storage';
import { ELEMENT_ID } from 'src/constants';

import { SellPrice } from './SellPrice';


const Tooltip = (props: Props): JSX.Element | null => {
  const storage = useStorage();
  const [item, setItem] = React.useState<i.ItemData>();

  // Get item data
  React.useEffect(() => {
    setItem(undefined);

    storage.getItem(props.itemName).then(setItem);
  }, [storage.user, props.itemName]);

  return (
    <table id={ELEMENT_ID.TOOLTIP}>
      <tbody>
        <tr>
          <td>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td>
                    <span className="q whtt-extra whtt-ilvl">
                      Auction House Data for {storage.user.server.name}-{storage.user.faction}
                    </span>
                    <div className="whtt-sellprice" style={{ marginBottom: '10px' }}>
                      {!item ? <LoadingSvg /> : `Last updated: ${item.lastUpdated}`}
                    </div>
                  </td>
                </tr>
                {item && (
                  <tr>
                    <td>
                      <SellPrice heading="Market Value" value={item.marketValue} />
                      <SellPrice heading="Historical Value" value={item.historicalValue} />
                      <SellPrice heading="Minimum Buyout" value={item.minimumBuyout} />

                      {typeof props.children === 'function'
                        ? props.children(item)
                        : props.children}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </td>

          <th style={{ backgroundPosition: 'top right' }} />
        </tr>

        <tr>
          <th style={{ backgroundPosition: 'bottom left' }} />
          <th style={{ backgroundPosition: 'bottom right' }} />
        </tr>
      </tbody>
    </table>
  );
};

type Props = {
  itemName: string;
  children?: JSX.Element | ((item: i.ItemData) => JSX.Element);
}

export default Tooltip;
