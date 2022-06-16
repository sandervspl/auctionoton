import type * as i from 'types';
import React from 'react';
import dayjs from 'dayjs';

import useStorageQuery from 'hooks/useStorageQuery';
import useItemFetcher from 'hooks/useItemFetcher';
import LoadingSvg from 'static/loading.svg';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';

import { SellPrice } from './tooltip/SellPrice';

const SingleItemLayout: React.FC<Props> = (props) => {
  if (!props.itemId) {
    throw new Error('the "itemId" prop is missing in SingleItemTooltip! Pass the "itemId" prop to the <Tooltip /> component.');
  }

  const { data: user } = useStorageQuery('user');
  const { error, isFetching, isLoading, item } = useItemFetcher(props.itemId);
  const isClassicWowhead = useIsClassicWowhead();

  function getRelativeTime() {
    if (item?.__version === 'classic') {
      if (!item?.stats.lastUpdated) {
        return 'N/A';
      }

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
    <>
      <tr>
        <td>
          <span className="q whtt-extra whtt-ilvl">
            <span className="capitalize">
              {getServerName()}
            </span>
          </span>
          <div className="mb-4 whtt-sellprice">
            Last updated: {getRelativeTime()}
          </div>
        </td>
      </tr>
      {item ? (
        <tr>
          <td>
            {(() => {
              // Support for older versions
              if (!('__version' in item) || item.__version === 'classic') {
                if (!item.stats.lastUpdated) {
                  return 'No data is available for this realm.';
                }

                return (
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
                    <SellPrice
                      heading="Quantity"
                      amount={props.amount}
                      value={`${item.stats.current.quantity} auction${item.stats.current.quantity === 1 ? '' : 's'}`}
                    />
                  </>
                );
              }

              // if (item.__version === 'retail') {
              //   return (
              //     <>
              //       <SellPrice
              //         heading="Buyout Price"
              //         amount={props.amount}
              //         value={item.buyoutPrice}
              //       />
              //       <SellPrice
              //         heading="Unit Price"
              //         amount={props.amount}
              //         value={item.unitPrice}
              //       />
              //       <SellPrice
              //         heading="Quantity"
              //         amount={props.amount}
              //         value={`${item.quantity} auction${item.quantity === 1 ? '' : 's'}`}
              //       />
              //     </>
              //   );
              // }
            })()}

            {/* Only show this loading indicator if we can show a cached item */}
            {item && (isLoading || isFetching) ? (
              <div className="flex items-center mt-4">
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
            <LoadingSvg className="inline-block mt-4 mr-1 w-4" />
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
    </>
  );
};

SingleItemLayout.defaultProps = {
  amount: 1,
};

type Props = {
  itemId?: number;
  amount?: number;
};

export default SingleItemLayout;
