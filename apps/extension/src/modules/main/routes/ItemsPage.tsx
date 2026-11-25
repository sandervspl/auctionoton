import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';
import cn from 'classnames';
import { Loader2Icon } from 'lucide-react';

import useItemFetcher from '@/hooks/useItemFetcher';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { useAuctionHouse } from '@/hooks/useAuctionHouse';

import { ChangeRealmButton } from '../ChangeRealmButton';
import { Value } from '../tooltip/Value';
import { sortBuyoutRows } from '@/utils/sortBuyoutRows';

type Sorting = null | 'asc' | 'desc';

const ItemsPage: React.FC = () => {
  const auctionHouseId = useAuctionHouse();
  const [sorting, setSorting] = React.useState<Sorting>(null);

  const resetSorting = React.useCallback(() => {
    setSorting(null);
  }, []);

  const { header, rows } = useListRows();
  const resetButton = React.useRef<Element | null>(null);
  const sortByBuyout = () => {
    const direction = sorting === 'asc' ? 'desc' : 'asc';
    const groups = new Map<Node, HTMLElement[]>();
    for (const { rowEl } of rows) {
      if (!rowEl.parentNode) continue;
      const group = groups.get(rowEl.parentNode) ?? [];
      group.push(rowEl);
      groups.set(rowEl.parentNode, group);
    }
    for (const [parent, group] of groups) {
      const fragment = document.createDocumentFragment();
      for (const row of sortBuyoutRows(group, direction)) fragment.append(row);
      parent.appendChild(fragment);
    }
    for (const el of Array.from(
      document.querySelectorAll('.listview-sort-desc, .listview-sort-asc'),
    )) {
      el.classList.remove('listview-sort-desc', 'listview-sort-asc');
    }
    window.history.replaceState(
      '',
      document.title,
      window.location.pathname + window.location.search,
    );
    const button = document.querySelector<HTMLElement>('.listview-reset-sort');
    resetButton.current?.removeEventListener('click', resetSorting);
    resetButton.current = button;
    button?.style.removeProperty('display');
    button?.addEventListener('click', resetSorting);
    setSorting(direction);
  };

  React.useEffect(() => {
    window.addEventListener('hashchange', resetSorting);

    return function cleanup() {
      window.removeEventListener('hashchange', resetSorting);
      resetButton.current?.removeEventListener('click', resetSorting);
    };
  }, [resetSorting]);

  if (!header) return null;

  return (
    <>
      {ReactDOM.createPortal(
        <th id="buyout-header">
          <div>
            {!auctionHouseId ? (
              <ChangeRealmButton />
            ) : (
              <>
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
              </>
            )}
          </div>
        </th>,
        header,
      )}
      {auctionHouseId &&
        rows.map(({ rowEl, itemId, key }) =>
          ReactDOM.createPortal(<TableCell {...{ itemId, auctionHouseId, rowEl }} />, rowEl, key),
        )}
    </>
  );
};

type Props = {
  itemId: number;
  auctionHouseId: number;
  rowEl: Element;
};

const TableCell = React.memo((props: Props) => {
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
    const raw = typeof buyout === 'object' ? buyout.raw : Number(buyout);
    props.rowEl.setAttribute('data-buyout-raw', Number.isFinite(raw) && raw > 0 ? String(raw) : '');
  }, [props.rowEl, buyout]);

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
});

export default ItemsPage;

type ListRow = { rowEl: HTMLElement; itemId: number; key: string };

function useListRows() {
  const [list, setList] = React.useState<{ header: Element | null; rows: ListRow[] }>({
    header: null,
    rows: [],
  });
  React.useEffect(() => {
    const keys = new WeakMap<Element, string>();
    let nextKey = 0;
    let frame = 0;
    let observed: Element = document.body;
    const refresh = () => {
      const root = document.querySelector('[data-template="item"]');
      if (observed !== (root ?? document.body)) {
        observer.disconnect();
        observed = root ?? document.body;
        observer.observe(observed, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['href'],
        });
      }
      const header = root?.querySelector('table > thead > tr') ?? null;
      const rows: ListRow[] = [];
      for (const rowEl of Array.from(root?.querySelectorAll<HTMLElement>('.listview-row') ?? [])) {
        const href = rowEl.querySelector('a[href*="/item="]')?.getAttribute('href');
        const itemId = Number(href?.match(/item=(\d+)/)?.[1]);
        if (!itemId) continue;
        if (!keys.has(rowEl)) keys.set(rowEl, String(nextKey++));
        rows.push({ rowEl, itemId, key: keys.get(rowEl)! });
      }
      setList((previous) =>
        previous.header === header &&
        previous.rows.length === rows.length &&
        rows.every(
          (row, index) =>
            row.rowEl === previous.rows[index].rowEl && row.itemId === previous.rows[index].itemId,
        )
          ? previous
          : { header, rows },
      );
    };
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refresh);
    });
    // Host navigation may replace the whole list, outside the scoped observer.
    // Keep this callback cheap for unrelated page mutations.
    const lifecycle = new MutationObserver(() => {
      if (observed === document.body || !observed.isConnected) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(refresh);
      }
    });
    lifecycle.observe(document.body, { childList: true, subtree: true });
    observer.observe(observed, { childList: true, subtree: true });
    refresh();
    return () => {
      observer.disconnect();
      lifecycle.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return list;
}
