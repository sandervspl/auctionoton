import * as i from 'types';
import React from 'react';
import produce from 'immer';

import LoadingSvg from 'static/loading.svg';
import { useStore } from 'state/store';
import { ELEMENT_ID } from 'src/constants';
import api from 'utils/api';

import { SellPrice } from './SellPrice';


const Tooltip: React.FC<Props> = (props) => {
  const storage = useStore((store) => store.storage);
  const item = React.useRef<i.ItemData>();
  const [modItem, setModItem] = React.useState<i.ItemData>();
  const [loading, setLoading] = React.useState(false);


  function setItem(newItem?: i.ItemData) {
    item.current = newItem;
    setModItem(newItem);
    setItemValuesForAmount();
  }

  async function getItem() {
    setItem(undefined);
    setLoading(true);

    // Get item from cache and check if we need to fetch a new item
    const cacheItem = storage.actions.getItem(props.itemName, (fetchedItem) => {
      setItem(fetchedItem);
      setLoading(false);
    });

    // Set item from cache
    setItem(cacheItem);
  }

  function setItemValuesForAmount() {
    if (!modItem) {
      setModItem(item.current);
    }

    setModItem((modItem) => produce(modItem, (draftState) => {
      if (!draftState || !item.current) {
        return draftState;
      }

      const prices = {
        historicalValue: { ...item.current.historicalValue },
        marketValue: { ...item.current.marketValue },
        minimumBuyout: { ...item.current.minimumBuyout },
      };

      let type: keyof typeof prices;
      for (type in prices) {
        // Can be "Unavailable"
        if (typeof prices[type] === 'string') {
          continue;
        }

        let coin: keyof typeof prices[typeof type];
        for (coin in prices[type]) {
          prices[type][coin] *= props.amount!;
        }

        // Overflow from copper to silver
        if (prices[type].copper >= 100) {
          prices[type].silver ||= 0;
          // Add all but the remainder from copper to silver
          prices[type].silver += (prices[type].copper - prices[type].copper % 100) / 100;
          // Keep the remainder in copper
          prices[type].copper %= 100;
        }

        // Overflow from silver to gold
        if (prices[type].silver >= 100) {
          prices[type].gold ||= 0;
          prices[type].gold += (prices[type].silver - prices[type].silver % 100) / 100;
          prices[type].silver %= 100;
        }

        draftState[type] = prices[type];
      }
    }));
  }

  // Get item data
  React.useEffect(() => {
    getItem();

    return function cleanup() {
      api.cancelRequest();
    };
  }, [storage.user, props.itemName]);

  React.useEffect(setItemValuesForAmount, [props.amount]);


  const lastUpdated = modItem
    ? modItem.lastUpdated === 'Unknown'
      ? ['Last updated: ', <span style={{ color: '#b9b9b9' }}>{modItem?.lastUpdated}</span>]
      : `Last updated: ${modItem.lastUpdated}`
    : <LoadingSvg />;

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
                      {lastUpdated}
                    </div>
                  </td>
                </tr>
                {modItem && (
                  <tr>
                    <td>
                      <SellPrice heading="Market Value" amount={props.amount} value={modItem.marketValue} />
                      <SellPrice heading="Historical Value" amount={props.amount} value={modItem.historicalValue} />
                      <SellPrice heading="Minimum Buyout" amount={props.amount} value={modItem.minimumBuyout} />
                      <SellPrice heading="Quantity" amount={props.amount} value={`${modItem.quantity} auction${modItem.quantity === 1 ? '' : 's'}`} />

                      {/* Only show this loading indicator if we can show a cached item */}
                      {item.current && loading && (
                        <div style={{ display: 'flex', marginTop: '10px' }}>
                          <LoadingSvg style={{ display: 'inline-block', marginRight: '5px', width: '15px' }} />
                          Fetching latest price info...
                        </div>
                      )}

                      {typeof props.children === 'function'
                        ? props.children(modItem)
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

Tooltip.defaultProps = {
  amount: 1,
};

type Props = {
  itemName: string;
  amount?: number;
  children?: JSX.Element | ((item: i.ItemData) => JSX.Element | null);
}

export default Tooltip;
