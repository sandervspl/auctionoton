import * as i from 'types';
import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from 'react-query';
import cn from 'classnames';

import LoadingSvg from 'static/loading.svg';
import useMemoUser from 'hooks/useMemoUser';
import useGetItemFromPage from 'hooks/useGetItemFromPage';
import useItemFetcher from 'hooks/useItemFetcher';
import { Value } from './tooltip/Value';
import useIntersectionObserver from 'hooks/useIntersectionObserver';

const TableBuyout = () => {
  const anchors = document.querySelectorAll(
    '.listview-scroller-horizontal td div del + a[href*="/item="]',
  );
  const itemIds = Array.from(anchors)
    .map((anchor) => anchor.href.split('/item=')[1].split('/')[0])
    .sort();
  const memoUser = useMemoUser();
  const { data: items } = useQuery(
    ['items', memoUser.server, memoUser.faction, itemIds],
    async () => {
      const itemIdChunks = itemIds.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / 5);

        if (!resultArray[chunkIndex]) {
          resultArray[chunkIndex] = []; // start a new chunk
        }

        resultArray[chunkIndex].push(item);

        return resultArray;
      }, [] as string[][]);

      const data: i.ItemDataClassicResponse[] = [];

      // for await (const chunk of itemIdChunks) {
      //   const items = await Promise.all(chunk.map(async (itemId) => {
      //     const { data: item } = await axios.get<i.ItemDataClassicResponse>(EdgeAPI.ItemUrl, {
      //       params: {
      //         id: itemId,
      //         server_name: memoUser.server,
      //         faction: memoUser.faction,
      //         amount: 1,
      //       },
      //     });

      //     return item;
      //   }))

      //   data.push(...items);
      // }

      return data;
    },
    {
      enabled: itemIds.length > 0,
      refetchOnWindowFocus: false,
      cacheTime: Infinity,
      staleTime: 1000 * 60 * 60, // 1 hour
    },
  );

  // console.log({items});

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
  });
  const isVisible = entry?.isIntersecting;
  const { isError, isLoading, item } = useItemFetcher(props.itemId, {
    // Always fetch first 10 items, after that only fetch when visible
    enabled: props.num < 10 || isVisible,
  });
  const isFetchingItem = !item || isLoading;

  return (
    <td
      ref={cellRef}
      className={cn({
        'auc-text-left': isError,
        'auc-text-center': isFetchingItem,
      })}
    >
      {isError ? (
        'Error!'
      ) : isFetchingItem ? (
        <LoadingSvg />
      ) : (
        <Value value={item.stats.current.minimumBuyout} />
      )}
    </td>
  );
};

type Props = {
  num: number;
  itemId: number;
};

export default TableBuyout;
