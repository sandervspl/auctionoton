import type * as i from 'types';
import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';

import ExternalLinkSvg from 'static/external-link.svg';
import RedoSvg from 'static/redo-solid.svg';
import GlobeSvg from 'static/globe-americas-regular.svg';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import useGetItemFromPage from 'hooks/useGetItemFromPage';
import useStorageQuery from 'hooks/useStorageQuery';

import Tooltip from './tooltip';
import generateContainer from './generateContainer';

const PageTooltip = (): React.ReactPortal | null => {
  const isClassicWowhead = useIsClassicWowhead();
  const { item: pageItem, isAuctionableItem } = useGetItemFromPage();
  const { data: user } = useStorageQuery('user');

  const tooltipElementId = `tt${pageItem?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);

  function createNexushubLink(item: i.CachedItemDataClassic): string | void {
    const server = user?.server.classic?.slug;

    if (server) {
      const faction = user?.faction[server]?.toLowerCase();
      return `https://nexushub.co/wow-classic/items/${server}-${faction}/${item.uniqueName}`;
    }
  }

  if (!tooltipElement) {
    return null;
  }

  const container = generateContainer(tooltipElement, 'page');

  if (!container || !pageItem) {
    return null;
  }

  if (!isAuctionableItem(tooltipElement.innerHTML)) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <div className="auc-h-2" />
      <p className="!auc-relative !auc-left-0 !auc-h-auto !auc-w-auto auc-text-[10px]">
        Auction House Prices for Wowhead
      </p>

      <Tooltip itemId={pageItem.id}>
        {({ error, loading, item, getItem }) => {
          return (
            <div className="auc-mt-2">
              {!loading && error && !item && (
                <div className="auc-mb-2">
                  <button
                    className="btn btn-small auc-btn"
                    onClick={() => getItem()}
                    title="Try loading item data again for Auctionoton"
                  >
                    {/* @ts-ignore */}
                    <RedoSvg className="auc-h-2 auc-pr-1" />
                    <span>Try again</span>
                  </button>
                </div>
              )}
              {isClassicWowhead && user && item && 'stats' in item && (
                <a
                  href={createNexushubLink(item as i.CachedItemDataClassic)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="q auc-flex auc-place-items-center auc-gap-1"
                >
                  {/* @ts-ignore */}
                  More information on Nexushub.co <ExternalLinkSvg />
                </a>
              )}
            </div>
          );
        }}
      </Tooltip>

      <div className="auc-h-1" />

      <button
        className="btn btn-small auc-btn"
        onClick={() => window.open(`${addon.runtime.getURL('form.html')}?large=true`)}
        title="Change server for Auctionoton"
      >
        {/* @ts-ignore */}
        <GlobeSvg className="auc-h-3 auc-pr-1" />
        <span>{!user?.version ? 'Add your realm!' : 'Change realm'}</span>
      </button>
    </>,
    container,
  );
};

export default PageTooltip;
