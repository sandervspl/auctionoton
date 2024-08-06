import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';
import cn from 'classnames';
import { Loader2Icon } from 'lucide-react';

import useItemFetcher from '@/hooks/useItemFetcher';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { useAuctionHouse } from '@/hooks/useAuctionHouse';

import { Value } from '../tooltip/Value';

type Sorting = null | 'asc' | 'desc';

const ItemsPage: React.FC = () => {
  const auctionHouseId = useAuctionHouse();
  const [sorting, setSorting] = React.useState<Sorting>(null);

  const resetSorting = React.useCallback(() => {
    setSorting(null);
  }, []);

  const sortByBuyout = React.useCallback(
    function sortByBuyout() {
      if (document.querySelectorAll('tr[data-buyout-raw]').length === 0) {
        console.error('No rows found!');
        return;
      }

      // The table displays a reset button when a sorting is active
      const resetBtn = document.querySelector('.listview-reset-sort') as
        | HTMLAnchorElement
        | undefined;
      if (resetBtn) {
        // Make button visible
        resetBtn.style.removeProperty('display');

        // Remove sorting if user clicks the reset button
        resetBtn.addEventListener('click', resetSorting);
      }

      // Remove other sorting indicators
      for (const el of [
        Array.from(document.querySelectorAll('.listview-sort-desc')),
        Array.from(document.querySelectorAll('.listview-sort-asc')),
      ].flat()) {
        // Remove class which gives the indicator
        el.classList.remove('listview-sort-desc', 'listview-sort-asc');

        // Remove hash from URL
        window.history.pushState(
          '',
          document.title,
          window.location.pathname + window.location.search,
        );
      }

      const curSorting = sorting || 'asc';

      // Sort rows and append to table
      let i = 0;
      let switching = true;
      let shouldSwitch = false;
      let switchcount = 0;
      let loopCount = 0;
      const MAX_LOOP_COUNT = 500;

      while (switching) {
        if (++loopCount > MAX_LOOP_COUNT) {
          throw new Error('Too many loops!');
        }

        switching = false;
        const rows = document.querySelectorAll('tr[data-buyout-raw]');

        for (i = 0; i < rows.length; i++) {
          const a = rows[i];
          const b = rows[i + 1];

          if (a == null || b == null) {
            continue;
          }

          const boa = Number(a.dataset.buyoutRaw);
          const bob = Number(b.dataset.buyoutRaw);

          if (curSorting === 'asc') {
            if (boa > bob) {
              shouldSwitch = true;
              break;
            }
          } else if (curSorting === 'desc') {
            if (boa < bob) {
              shouldSwitch = true;
              break;
            }
          }
        }

        if (shouldSwitch) {
          if (rows[i]) {
            rows[i].parentNode?.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
          }
        } else {
          if (switchcount === 0 && curSorting === 'asc') {
            setSorting('desc');
            switching = true;
          }
        }
      }

      setSorting(curSorting === 'asc' ? 'desc' : 'asc');

      return function cleanup() {
        resetBtn?.addEventListener('click', resetSorting);
      };
    },
    [sorting, resetSorting],
  );

  React.useEffect(() => {
    window.addEventListener('hashchange', resetSorting);

    return function cleanup() {
      window.removeEventListener('hashchange', resetSorting);
    };
  }, [resetSorting]);

  return (
    <>
      {ReactDOM.createPortal(
        <th id="buyout-header">
          <div>
            {/* biome-ignore lint/a11y/useValidAnchor: Valid error but this is what Wowhead does */}
            <a onClick={sortByBuyout}>
              <span
                className={cn({
                  'listview-sort-asc': sorting === 'asc',
                  'listview-sort-desc': sorting === 'desc',
                })}
              >
                <span>AH Buyout</span>
              </span>
            </a>
          </div>
        </th>,
        document.querySelector(
          '[data-template="item"] > div.listview-scroller-horizontal > div > table > thead > tr',
        )!,
      )}
      {Array.from(document.querySelectorAll('.listview-row')).map((rowEl, i) => {
        const anchorEl = rowEl.querySelector('a[href*="/item="]');
        const itemIdRaw = anchorEl?.href.split('item=')[1].split('/')[0];
        const itemId = itemIdRaw == null ? null : Number(itemIdRaw);

        if (!itemId || !auctionHouseId) {
          return null;
        }

        return ReactDOM.createPortal(
          <TableCell num={i} {...{ itemId, auctionHouseId, rowEl, sorting }} />,
          rowEl,
        );
      })}
    </>
  );
};

type Props = {
  num: number;
  itemId: number;
  auctionHouseId: number;
  rowEl: Element;
  sorting: Sorting;
};

const TableCell: React.FC<Props> = (props) => {
  const cellRef = React.useRef<HTMLTableCellElement>(null);
  const entry = useIntersectionObserver(cellRef, {
    freezeOnceVisible: true,
    disconnectOnceVisible: true,
  });
  const isVisible = entry?.isIntersecting;
  const { isError, isLoading, isFetching, item } = useItemFetcher(
    props.itemId,
    props.auctionHouseId,
    {
      enabled: !!props.auctionHouseId && !!props.itemId && isVisible,
      retryOnMount: false,
    },
  );
  const isFetchingItem = !item || isLoading;
  const buyout = item?.stats.current.minBuyout;

  React.useEffect(() => {
    let val = null;

    if (buyout == null || buyout.toString() === '0') {
      if (props.sorting !== 'desc') {
        val = '999999999999999999';
      } else {
        val = '0';
      }
    } else {
      val = buyout.toString();
    }

    props.rowEl.setAttribute('data-buyout-raw', val);
  }, [props.rowEl, buyout, props.sorting]);

  return (
    <td ref={cellRef} className="text-left">
      {isError && !item ? (
        <span className="auc-flex">Error!</span>
      ) : item && (isLoading || isFetching) ? (
        <div className="auc-flex auc-gap-2">
          <Loader2Icon size={15} className="auc-animate-spin" />
          <Value value={item.stats.current.minBuyout} />
        </div>
      ) : item ? (
        <Value value={item.stats.current.minBuyout} />
      ) : isFetchingItem && isVisible ? (
        <Loader2Icon className="auc-animate-spin" />
      ) : (
        'N/A'
      )}
    </td>
  );
};

export default ItemsPage;
