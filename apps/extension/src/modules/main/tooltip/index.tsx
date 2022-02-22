import * as i from 'types';
import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import LoadingSvg from 'static/loading.svg';
// import WarningSvg from 'static/exclamation-circle-regular.svg';
import { ELEMENT_ID } from 'src/constants';
import useItemFetcher from 'hooks/useItemFetcher';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import useStorageQuery from 'hooks/useStorageQuery';

import { SellPrice } from './SellPrice';

dayjs.extend(relativeTime);

/** @TODO */
/**
 * x fix new item format
 * - add tooltip with text to add your server with a link to the form
 */

const Tooltip: React.FC<Props> = (props) => {
  const { data: user } = useStorageQuery('user');
  const { error, isFetching, isLoading, item, refetch } = useItemFetcher(props.itemId);
  const isClassicWowhead = useIsClassicWowhead();

  if (!user?.version) {
    return null;
  }

  /** @TODO Show link to change realm, let user know to set realm */
  if (isClassicWowhead && !user?.server.classic) {
    return null;
  }

  if (!isClassicWowhead && !user?.server.retail) {
    return null;
  }

  function getRelativeTime() {
    if (item?.__version === 'classic') {
      return dayjs(item?.stats.lastUpdated).fromNow();
    } else if (item?.__version === 'retail') {
      // return dayjs(item?.lastUpdated).fromNow();
    }

    return 'N/A';
  }

  function getServerName(): string {
    const version: i.Versions = isClassicWowhead ? 'classic' : 'retail';
    const serverName = user?.server[version];
    const region = user?.region?.toUpperCase();

    if (!serverName) {
      return 'Unknown';
    }

    if ('slug' in serverName) {
      const faction = user?.faction[serverName.slug];

      return `${serverName.name} ${region}-${faction}`;
    }

    return `${serverName.name}-${region}`;
  }

  const errorStr = `Error: ${error || 'Something went wrong. Try again later.'}`;

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
                      <span className="capitalize">
                        {getServerName()}
                      </span>
                    </span>
                    <div className="whtt-sellprice mb-2">
                      Last updated: {getRelativeTime()}
                    </div>
                  </td>
                </tr>
                {item ? (
                  <tr>
                    <td>
                      {/* Support for older versions */}
                      {(!('__version' in item) || item.__version === 'classic') ? (
                        <>
                          <SellPrice
                            heading="Market Value"
                            amount={props.amount}
                            value={item.stats.current.marketValue}
                          />
                          <SellPrice
                            heading="Historical Value"
                            amount={props.amount}
                            value={item.stats.current.historicalValue}
                          />
                          <SellPrice
                            heading="Minimum Buyout"
                            amount={props.amount}
                            value={item.stats.current.minimumBuyout}
                          />
                        </>
                      ) : null}
                      {/* {item.__version === 'retail' ? (
                        <>
                          <SellPrice
                            heading="Buyout Price"
                            amount={props.amount}
                            value={item.buyoutPrice}
                          />
                          <SellPrice
                            heading="Unit Price"
                            amount={props.amount}
                            value={item.unitPrice}
                          />
                        </>
                      ) : null} */}
                      <SellPrice
                        heading="Quantity"
                        amount={props.amount}
                        value={
                          item.__version === 'classic'
                            ? `${item.stats.current.quantity} auction${item.stats.current.quantity === 1 ? '' : 's'}`
                            : `${item.quantity} auction${item.quantity === 1 ? '' : 's'}`
                        }
                      />

                      {/* Only show this loading indicator if we can show a cached item */}
                      {item && (isLoading || isFetching) ? (
                        <div className="flex mt-2">
                          <LoadingSvg className="inline-block mr-1 w-4" />
                          Fetching latest price info...
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
                {(!item || !item) && (isLoading || isFetching) ? (
                  <tr>
                    <td>
                      <LoadingSvg />
                    </td>
                  </tr>
                ) : null}
                {error ? (
                  <tr>
                    <td>
                      <div className="flex mt-2 text-red-500">
                        {errorStr}
                      </div>
                    </td>
                  </tr>
                ) : null}
                {/* {warning ? (
                  <tr>
                    <td>
                      <div className="mt-1">
                        <WarningSvg className="h-3" />
                        {warning}
                      </div>
                    </td>
                  </tr>
                ) : null} */}
                <tr>
                  <td>
                    {typeof props.children === 'function'
                      ? props.children({ error: !!error, item, loading: isLoading || isFetching, getItem: refetch })
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
  children: null | JSX.Element | ((args: ChildrenFuncArgs) => JSX.Element | null);
}

export default Tooltip;
