import * as i from 'types';
import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { css } from '@emotion/css';

import LoadingSvg from 'static/loading.svg';
import WarningSvg from 'static/exclamation-circle-regular.svg';
import { useStore } from 'state/store';
import { ELEMENT_ID } from 'src/constants';
import useGetItem from 'hooks/useGetItem';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';

import { SellPrice } from './SellPrice';

dayjs.extend(relativeTime);


const Tooltip: React.FC<Props> = (props) => {
  const storage = useStore((store) => store.storage);
  const { loading, error, warning, item, mutableItem, getItem } = useGetItem(props.itemId, props.amount);
  const isClassicWowhead = useIsClassicWowhead();

  function getRelativeTime() {
    if (item?.lastUpdated) {
      return dayjs(item?.lastUpdated).fromNow();
    }

    return '';
  }


  const errorStr = `Error: ${error || 'Something went wrong. Try again later.'}`;
  const lastUpdatedStr = (() => {
    if (item) {
      if (item.lastUpdated === 'Unknown') {
        return (
          <>
            Last Updated:&nbsp;
            <span
              key="unknown-tag"
              className={css`
                color: #b9b9b9
              `}
            >
              {item.lastUpdated}
            </span>
          </>
        );
      }

      return `Last updated: ${getRelativeTime()}`;
    }
  })();

  if (!storage.user.version) {
    return null;
  }

  if (isClassicWowhead && !storage.user.server.classic) {
    return null;
  }

  if (!isClassicWowhead && !storage.user.server.retail) {
    return null;
  }

  function getServerName(): string {
    const version: i.Versions = isClassicWowhead ? 'classic' : 'retail';
    const serverName = storage.user.server[version];
    const region = storage.user.region.toUpperCase();

    if (!serverName) {
      return 'Unknown';
    }

    if ('slug' in serverName) {
      const faction = storage.user.faction[serverName.slug];

      return `${serverName.name} ${region}-${faction}`;
    }

    return `${serverName.name}-${region}`;
  }

  return (
    <table id={ELEMENT_ID.TOOLTIP}>
      <tbody>
        <tr>
          <td>
            <table className={css`
              width: 100%;
            `}>
              <tbody>
                <tr>
                  <td>
                    <span className="q whtt-extra whtt-ilvl">
                      Auction House Data for
                      <span className={css`
                        text-transform: capitalize;
                      `}>
                        &nbsp;{getServerName()}
                      </span>
                    </span>
                    <div className={'whtt-sellprice ' + css`
                      margin-bottom: 10px;
                    `}>
                      {lastUpdatedStr}
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
                            value={mutableItem.marketValue}
                          />
                          <SellPrice
                            heading="Historical Value"
                            amount={props.amount}
                            value={mutableItem.historicalValue}
                          />
                          <SellPrice
                            heading="Minimum Buyout"
                            amount={props.amount}
                            value={mutableItem.minimumBuyout}
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
                        value={`${mutableItem.quantity} auction${mutableItem.quantity === 1 ? '' : 's'}`}
                      />

                      {/* Only show this loading indicator if we can show a cached item */}
                      {item && loading && (
                        <div className={css`
                          display: flex;
                          margin-top: 10px;
                        `}>
                          <LoadingSvg className={css`
                            display: inline-block;
                            margin-right: 5px;
                            width: 15px;
                          `} />
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
                      <div className={css`
                        display: flex;
                        margin-top: 10px;
                        color: #a71a19;
                      `}>
                        {errorStr}
                      </div>
                    </td>
                  </tr>
                )}
                {warning && (
                  <tr>
                    <td>
                      <div className={css`
                        margin-top: 5px;
                      `}>
                        <WarningSvg className={css`
                          height: 12px;
                        `} />
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

          <th className={css`
            background-position: top right !important;
          `} />
        </tr>

        <tr>
          <th className={css`
            background-position: bottom left !important;
          `} />
          <th className={css`
            background-position: bottom right !important;
          `} />
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
