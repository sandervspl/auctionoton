import * as i from 'types';
import React from 'react';
import dayjs from 'dayjs';
import cn from 'classnames';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useQuery } from 'react-query';

import LoadingSvg from 'static/loading.svg';
// import WarningSvg from 'static/exclamation-circle-regular.svg';
import { ELEMENT_ID } from 'src/constants';
import useItemFetcher from 'hooks/useItemFetcher';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import useStorageQuery from 'hooks/useStorageQuery';

import { SellPrice } from './SellPrice';
import { TooltipBody } from './TooltipBody';

dayjs.extend(relativeTime);

/** @TODO */
/**
 * x fix new item format
 * - add tooltip with text to add your server with a link to the form
 */

const Tooltip: React.FC<Props> = (props) => {
  const { data: user } = useStorageQuery('user');
  const { error, isFetching, isLoading, item, refetch } = useItemFetcher(props.itemId);
  const { isClassicWowhead, isEra } = useIsClassicWowhead();
  const { data: lastUpdated } = useQuery(
    ['tooltip', 'last-updated', props.itemId, item?.updatedAt],
    () => {
      if (item?.__version === 'classic') {
        if (!item?.stats.lastUpdated) {
          return {
            hours: -1,
            text: 'N/A',
          };
        }

        const time = dayjs(item.stats.lastUpdated);

        return {
          hours: Math.abs(time.diff(dayjs(), 'hour')),
          text: time.fromNow(),
        };
      }

      return {
        hours: -1,
        text: 'N/A',
      };
    },
    {
      enabled: !!item,
      refetchOnWindowFocus: true,
      refetchInterval: 60 * 1000,
    },
  );

  if (!user?.realms) {
    return null;
  }

  /** @TODO Show link to change realm, let user know to set realm */
  if (isClassicWowhead && !user?.realms.classic) {
    return null;
  }

  const errorStr = `Error: ${error || 'Something went wrong. Try again later.'}`;

  return (
    <TooltipBody
      id={ELEMENT_ID.TOOLTIP}
      header={
        <>
          {lastUpdated && (
            <div className="whtt-sellprice auc-mb-2">
              Last updated:&nbsp;
              <span
                className={cn({
                  q2: lastUpdated.hours < (isEra ? 24 : 3),
                  q10: lastUpdated.hours >= (isEra ? 24 : 3),
                })}
              >
                {lastUpdated.text}
              </span>
            </div>
          )}
        </>
      }
    >
      {item ? (
        <tr className="auc-block auc-w-full">
          <td className="auc-block auc-w-full">
            {(() => {
              // Support for older versions
              if (!('__version' in item) || item.__version === 'classic') {
                if (!item?.stats?.current?.minimumBuyout) {
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
                      value={`${item.stats.current.quantity} auction${
                        item.stats.current.quantity === 1 ? '' : 's'
                      }`}
                    />
                  </>
                );
              }
            })()}

            {/* Only show this loading indicator if we can show a cached item */}
            {item && (isLoading || isFetching) ? (
              <div className="auc-mt-2 auc-flex">
                {/* @ts-ignore */}
                <LoadingSvg className="auc-mr-1 auc-inline-block auc-w-4" />
                Fetching latest price info...
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
      {(!item || !item) && (isLoading || isFetching) ? (
        <tr>
          <td>
            {/* @ts-ignore */}
            <LoadingSvg />
          </td>
        </tr>
      ) : null}
      {error && !item ? (
        <tr>
          <td>
            <div className="auc-mt-2 auc-flex auc-text-red-500">{errorStr}</div>
          </td>
        </tr>
      ) : null}
      {/* {warning ? (
                  <tr>
                    <td>
                      <div className="auc-mt-1">
                        <WarningSvg className="auc-h-3" />
                        {warning}
                      </div>
                    </td>
                  </tr>
                ) : null} */}
      <tr>
        <td>
          {typeof props.children === 'function'
            ? props.children({
                error: !!error,
                item,
                loading: isLoading || isFetching,
                getItem: refetch,
              })
            : props.children}
        </td>
      </tr>
    </TooltipBody>
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
