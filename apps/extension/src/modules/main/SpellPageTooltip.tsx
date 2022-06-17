import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';

import LoadingSvg from 'static/loading.svg';
import RedoSvg from 'static/redo-solid.svg';
import GlobeSvg from 'static/globe-americas-regular.svg';
import useGetPageData from 'hooks/useGetPageData';
import useStorageQuery from 'hooks/useStorageQuery';
import { useMultiItemFetcher } from 'hooks/useMultiItemFetcher';

import Tooltip from './tooltip';
import generateContainer from './generateContainer';
import MultiItemSumLayout from './layouts/MultiItemSumLayout';


const SpellPageTooltip = (): React.ReactPortal | null => {
  const { data: spell } = useGetPageData();
  const { data: user } = useStorageQuery('user');

  // Grab reagent elements from the page
  const reagentAnchorSelector =
      '#icon-list-reagents > tbody > tr > td:not([style^="padding"]) > a[href^="/item"]';

  const elements = Array.from(
    document.querySelectorAll(reagentAnchorSelector),
  );

  const reagentItems = [];
  for (const el of elements) {
    const amountStr = (el.nextSibling as HTMLElement)?.innerText;
    const amount = Number(amountStr.match(/\d+/g)?.[0] || 1);

    reagentItems.push({
      name: el.innerText,
      className: el.className,
      amount,
      id: Number(el.href.match(/\d+/g)?.[0] || -1),
    });
  }

  const {
    data: items, isLoading, isFetching, error, refetch, itemsFromStorage, storageFetched,
  } = useMultiItemFetcher(reagentItems.map((item) => Number(item.id)));

  if (reagentItems.length === 0 || !storageFetched) {
    return null;
  }

  const tooltipElementId = `tt${spell?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);

  if (!tooltipElement) {
    return null;
  }

  const container = generateContainer(tooltipElement, 'page');

  if (!container) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <Tooltip
        layout={<MultiItemSumLayout reagents={reagentItems} items={items || itemsFromStorage} />}
      >
        <div className="mt-2">
          {(!isLoading && error) ? (
            <div className="mb-2">
              <button
                className="btn btn-small"
                onClick={() => refetch()}
                title="Try loading data again for Auctionoton"
              >
                <RedoSvg className="pr-1 h-2" />
                <span>Try again</span>
              </button>
            </div>
          ) : null}

          {(isLoading || isFetching) ? (
            <div className="flex items-center mt-4">
              <LoadingSvg className="inline-block mr-1 w-4" />
              Fetching latest price info...
            </div>
          ) : null}
        </div>
      </Tooltip>

      <div className="h-1" />

      <button
        className="btn btn-small"
        onClick={() => window.open(`${addon.extension.getURL('form.html')}?large=true`)}
        title="Change server for Auctionoton"
      >
        <GlobeSvg className="pr-1 h-3" />
        <span>{!user?.version ? 'Add your realm!' : 'Change realm'}</span>
      </button>
    </>,
    container,
  );
};

export default SpellPageTooltip;
