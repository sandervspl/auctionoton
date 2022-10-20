import * as i from 'types';
import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from 'react-query';
import cn from 'classnames';

import LoadingSvg from 'static/loading.svg';
import useMemoUser from 'hooks/useMemoUser';
import useItemFetcher from 'hooks/useItemFetcher';
import { Value } from './tooltip/Value';
import useIntersectionObserver from 'hooks/useIntersectionObserver';

const TableBuyout = () => {
  React.useEffect(() => {
    const tableHead = document.querySelector(
      '#lv-items > div.listview-scroller-horizontal > div > table > thead > tr',
    );

    if (tableHead) {
      const th = document.createElement('th');
      th.textContent = 'AH Buyout';
      tableHead.appendChild(th);
    }
  }, []);

  return (
    <>
      {Array.from(document.querySelectorAll('.listview-row')).map((rowEl, i) => {
        const anchorEl = rowEl.querySelector('a[href*="/item="]');
        const itemIdRaw = anchorEl?.href.split('item=')[1].split('/')[0];

        if (!itemIdRaw) {
          return ReactDOM.createPortal(<td>N/A</td>, rowEl);
        }

        const itemId = Number(itemIdRaw);

        return ReactDOM.createPortal(<TableCell num={i} itemId={itemId} />, rowEl);
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
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const isFetchingItem = !item || isLoading;

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
};

export default TableBuyout;
