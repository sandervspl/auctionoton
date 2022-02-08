import * as i from 'types';
import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import LoadingSvg from 'static/loading.svg';
import WarningSvg from 'static/exclamation-circle-regular.svg';
import { useStore } from 'state/store';
import { ELEMENT_ID } from 'src/constants';
import useGetItem from 'hooks/useGetItem';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';

import { SellPrice } from './SellPrice';

dayjs.extend(relativeTime);

/** @TODO */
/**
 * x fix new item format
 * - add tooltip with text to add your server with a link to the form
 */

const Tooltip: React.FC<Props> = (props) => {
  const storage = useStore((store) => store.storage);
  const { loading, error, warning, item, mutableItem, getItem } = useGetItem(props.itemId, props.amount);
  const isClassicWowhead = useIsClassicWowhead();

  function getRelativeTime() {
    if (item?.__version === 'classic') {
      return dayjs(item?.stats.lastUpdated).fromNow();
    } else if (item?.__version === 'retail') {
      return dayjs(item?.lastUpdated).fromNow();
    }

    return '';
  }


  const errorStr = `Error: ${error || 'Something went wrong. Try again later.'}`;

  if (!storage?.user?.version) {
    return null;
  }

  /** @TODO Show link to change realm, let user know to set realm */
  if (isClassicWowhead && !storage?.user?.server?.classic) {
    return null;
  }

  if (!isClassicWowhead && !storage?.user?.server?.retail) {
    return null;
  }

  function getServerName(): string {
    const version: i.Versions = isClassicWowhead ? 'classic' : 'retail';
    const serverName = storage?.user?.server?.[version];
    const region = storage?.user?.region?.toUpperCase();

    if (!serverName) {
      return 'Unknown';
    }

    if ('slug' in serverName) {
      const faction = storage?.user?.faction?.[serverName.slug];

      return `${serverName.name} ${region}-${faction}`;
    }

    return `${serverName.name}-${region}`;
  }

  return (
    <table id={ELEMENT_ID.TOOLTIP}>
      <tbody>
        <tr>
          <td>
            <table className="w-full">
              <tbody>
                <tr>
                  <td>
                    <span className="q whtt-extra whtt-ilvl">
                      Auction House Data for
                      <span className="capitalize">
                        &nbsp;{getServerName()}
                      </span>
                    </span>
                    <div className="whtt-sellprice mb-2">
                      Last updated: {getRelativeTime()}
                    </div>
                  </td>
                </tr>
                {mutableItem && (
                  <tr>
                    <td>
                      {/* Support for older versions */}
                      {(!('__version' in mutableItem) || mutableItem.__version === 'classic') && (
                        <>
                          <SellPrice
                            heading="Market Value"
                            amount={props.amount}
                            value={mutableItem.stats.current.marketValue}
                          />
                          <SellPrice
                            heading="Historical Value"
                            amount={props.amount}
                            value={mutableItem.stats.current.historicalValue}
                          />
                          <SellPrice
                            heading="Minimum Buyout"
                            amount={props.amount}
                            value={mutableItem.stats.current.minimumBuyout}
                          />
                        </>
                      )}
                      {mutableItem.__version === 'retail' && (
                        <>
                          <SellPrice
                            heading="Buyout Price"
                            amount={props.amount}
                            value={mutableItem.buyoutPrice}
                          />
                          <SellPrice
                            heading="Unit Price"
                            amount={props.amount}
                            value={mutableItem.unitPrice}
                          />
                        </>
                      )}
                      <SellPrice
                        heading="Quantity"
                        amount={props.amount}
                        value={
                          mutableItem.__version === 'classic'
                            ? `${mutableItem.stats.current.quantity} auction${mutableItem.stats.current.quantity === 1 ? '' : 's'}`
                            : `${mutableItem.quantity} auction${mutableItem.quantity === 1 ? '' : 's'}`
                        }
                      />

                      {/* Only show this loading indicator if we can show a cached item */}
                      {item && loading && (
                        <div className="flex mt-2">
                          <LoadingSvg className="inline-block mr-1 w-4" />
                          Fetching latest price info...
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                {!item && loading && (
                  <tr>
                    <td>
                      <LoadingSvg />
                    </td>
                  </tr>
                )}
                {error && (
                  <tr>
                    <td>
                      <div className="flex mt-2 text-red-500">
                        {errorStr}
                      </div>
                    </td>
                  </tr>
                )}
                {warning && (
                  <tr>
                    <td>
                      <div className="mt-1">
                        <WarningSvg className="h-3" />
                        {warning}
                      </div>
                    </td>
                  </tr>
                )}
                <tr>
                  <td>
                    {typeof props.children === 'function'
                      ? props.children({ error: !!error, item, loading, getItem })
                      : props.children}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>

          <th className="!bg-right-top" />
        </tr>

        <tr>
          <th className="!bg-left-bottom" />
          <th className="!bg-right-bottom" />
        </tr>
      </tbody>
    </table>
  );
};

Tooltip.defaultProps = {
  amount: 1,
};

interface ChildrenFuncArgs {
  error: boolean;
  loading: boolean;
  item: i.MaybeAnyItem;
  getItem: i.ItemRefetchFn;
}

interface Props {
  itemId: number;
  amount?: number;
  children?: JSX.Element | ((args: ChildrenFuncArgs) => JSX.Element | null);
}

export default Tooltip;
