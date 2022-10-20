import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';

import LoadingSvg from 'static/loading.svg';
import useItemFetcher from 'hooks/useItemFetcher';
import useIntersectionObserver from 'hooks/useIntersectionObserver';

import { Value } from './tooltip/Value';

type Sorting = 'asc' | 'desc';

const TableBuyout = () => {
  const [sorting, setSorting] = React.useState<Sorting>('asc');

  const sortByBuyout = React.useCallback(
    function sortByBuyout() {
      if (document.querySelectorAll('tr[data-buyout-raw]').length === 0) {
        console.error('No rows found!');
        return;
      }

      const resetBtn = document.querySelector('.listview-reset-sort') as HTMLAnchorElement;
      if (resetBtn) {
        resetBtn.style.removeProperty('display');
      }

      // Sort rows and append to table
      let i = 0;
      let switching = true;
      let shouldSwitch = false;
      let switchcount = 0;
      let loopCount = 0;
      let MAX_LOOP_COUNT = 500;

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

          if (sorting === 'asc') {
            if (boa > bob) {
              shouldSwitch = true;
              break;
            }
          } else if (sorting === 'desc') {
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
          if (switchcount === 0 && sorting === 'asc') {
            setSorting('desc');
            switching = true;
          }
        }
      }

      setSorting(sorting === 'asc' ? 'desc' : 'asc');
    },
    [sorting, setSorting],
  );

  return (
    <>
      {ReactDOM.createPortal(
        <th id="buyout-header">
          <div>
            <a onClick={sortByBuyout}>
              <span>
                <span>AH Buyout</span>
              </span>
            </a>
          </div>
        </th>,
        document.querySelector(
          '#lv-items > div.listview-scroller-horizontal > div > table > thead > tr',
        )!,
      )}
      {Array.from(document.querySelectorAll('.listview-row')).map((rowEl, i) => {
        const anchorEl = rowEl.querySelector('a[href*="/item="]');
        const itemIdRaw = anchorEl?.href.split('item=')[1].split('/')[0];

        if (!itemIdRaw) {
          return ReactDOM.createPortal(<td>N/A</td>, rowEl);
        }

        const itemId = Number(itemIdRaw);

        return ReactDOM.createPortal(<TableCell num={i} itemId={itemId} rowEl={rowEl} />, rowEl);
      })}
    </>
  );
};

const TableCell: React.FC<Props> = (props) => {
  const cellRef = React.useRef<HTMLTableCellElement>(null);
  const entry = useIntersectionObserver(cellRef, {
    freezeOnceVisible: true,
    disconnectOnceVisible: true,
  });
  const isVisible = entry?.isIntersecting;
  const { isError, isLoading, item } = useItemFetcher(props.itemId, {
    enabled: isVisible,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const isFetchingItem = !item || isLoading;
  const buyout = item?.stats.current.minimumBuyout;
  const raw = typeof buyout === 'string' ? buyout : buyout?.raw;

  React.useEffect(() => {
    props.rowEl.setAttribute('data-buyout-raw', raw?.toString() || '9999999999');
  }, [props.rowEl, raw]);

  return (
    <td ref={cellRef} className="auc-text-left">
      {isError ? (
        'Error!'
      ) : isFetchingItem && isVisible ? (
        <LoadingSvg />
      ) : item ? (
        <Value value={item.stats.current.minimumBuyout} />
      ) : null}
    </td>
  );
};

type Props = {
  num: number;
  itemId: number;
  rowEl: Element;
};

export default TableBuyout;
