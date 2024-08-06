import * as i from 'types';
import React from 'react';
import dayjs from 'dayjs';
import cn from 'classnames';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useQuery } from '@tanstack/react-query';
import { Loader2Icon } from 'lucide-react';

import { ELEMENT_ID } from '@/constants';
import useItemFetcher from '@/hooks/useItemFetcher';
import { useWowhead } from '@/hooks/useWowhead';
import useStorageQuery from '@/hooks/useStorageQuery';
import { useRealm } from '@/hooks/useRealm';

import { SellPrice } from './SellPrice';
import { TooltipBody } from './TooltipBody';

dayjs.extend(relativeTime);

/** @TODO */
/**
 * x fix new item format
 * - add tooltip with text to add your server with a link to the form
 */

type Props = {
  itemId: number;
  auctionHouseId: number;
  amount?: number;
  children: null | JSX.Element | ((args: ChildrenFuncArgs) => JSX.Element | null);
};

type ChildrenFuncArgs = {
  error: boolean;
  loading: boolean;
  item: i.MaybeAnyItem;
  getItem: i.ItemRefetchFn;
};

const Tooltip: React.FC<Props> = ({ amount = 1, ...props }) => {
  const { data: user } = useStorageQuery('user');
  const { error, isFetching, isLoading, item, refetch } = useItemFetcher(
    props.itemId,
    props.auctionHouseId,
  );
  const { isEra } = useWowhead();
  const { activeRealm } = useRealm();
  const { data: lastUpdated } = useQuery({
    queryKey: ['tooltip', props.itemId, item?.updatedAt],
    queryFn: async () => {
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
    },
    enabled: !!item,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });

  /** @TODO Show link to change realm, let user know to set realm */
  if (!user?.realms || !activeRealm) {
    return (
      <TooltipBody id={ELEMENT_ID.TOOLTIP}>
        <tr>
          <td>Please select a realm!</td>
        </tr>
      </TooltipBody>
    );
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
            {!item?.stats?.current?.minBuyout ? (
              'No data is available for this realm.'
            ) : (
              <>
                <SellPrice
                  heading="Market Value"
                  amount={amount}
                  value={item.stats.current.marketValue}
                />
                <SellPrice
                  heading="Historical Value"
                  amount={amount}
                  value={item.stats.current.historicalValue}
                />
                <SellPrice
                  heading="Minimum Buyout"
                  amount={amount}
                  value={item.stats.current.minBuyout}
                />
                <SellPrice
                  heading="Quantity"
                  amount={amount}
                  value={`${item.stats.current.quantity} auction${
                    item.stats.current.quantity === 1 ? '' : 's'
                  }`}
                />
              </>
            )}

            {/* Only show this loading indicator if we can show a cached item */}
            {item && (isLoading || isFetching) ? (
              <div className="mt-2 flex">
                {/* @ts-ignore */}
                <Loader2Icon className="auc-mr-1 auc-inline-block auc-w-4 auc-animate-spin" />
                Fetching latest price info...
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
      {(!item || !item) && (isLoading || isFetching) ? (
        <tr>
          <td>
            <Loader2Icon className="auc-animate-spin" />
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

export default Tooltip;
