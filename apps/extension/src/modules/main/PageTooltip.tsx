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
    const server = user?.server?.classic?.slug;

    if (server) {
      const faction = user?.faction?.[server]?.toLowerCase();
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
      <div className="h-2" />
      <p className="!relative !w-auto !h-auto text-[10px] !left-0">
        Auction House Prices for Wowhead
      </p>

      <Tooltip itemId={pageItem.id}>
        {({ error, loading, item, getItem }) => {
          return (
            <div className="mt-2">
              {(!loading && (error || !item)) && (
                <div className="mb-2">
                  <button
                    className="btn btn-small"
                    onClick={() => getItem()}
                    title="Try loading item data again for Auctionoton"
                  >
                    <RedoSvg className="pr-1 h-2" />
                    <span>Try again</span>
                  </button>
                </div>
              )}
              {isClassicWowhead && user && item && 'stats' in item && (
                <a
                  href={createNexushubLink(item as i.CachedItemDataClassic)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-1 place-items-center q"
                >
                More information on Nexushub.co <ExternalLinkSvg />
                </a>
              )}
            </div>
          );
        }}
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

export default PageTooltip;
