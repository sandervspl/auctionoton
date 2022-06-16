import type * as i from 'types';
import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';

import ExternalLinkSvg from 'static/external-link.svg';
import RedoSvg from 'static/redo-solid.svg';
import GlobeSvg from 'static/globe-americas-regular.svg';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import useGetPageData from 'hooks/useGetPageData';
import useStorageQuery from 'hooks/useStorageQuery';

import Tooltip from './tooltip';
import SingleItemLayout from './SingleItemLayout';
import generateContainer from './generateContainer';


const ItemPageTooltip = (): React.ReactPortal | null => {
  const isClassicWowhead = useIsClassicWowhead();
  const { data: pageItem, isAuctionableItem } = useGetPageData();
  const { data: user } = useStorageQuery('user');

  const tooltipElementId = `tt${pageItem?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);

  function createNexushubLink(item: i.CachedItemDataClassic): string | void {
    const server = user?.server.classic?.slug;

    if (item && server) {
      const faction = user?.faction[server]?.toLowerCase();
      return `https://nexushub.co/wow-classic/items/${server}-${faction}/${item.uniqueName}`;
    } else {
      return 'https://nexushub.co/wow-classic';
    }
  }

  if (!tooltipElement) {
    return null;
  }

  const container = generateContainer(tooltipElement, 'page');

  if (!container || !pageItem) {
    return null;
  }

  const itemMetaStr = tooltipElement
    .querySelector('table > tbody > tr:nth-child(1) > td > table:nth-child(1) > tbody > tr > td')
    ?.innerHTML;

  if (!isAuctionableItem(itemMetaStr)) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <Tooltip
        itemId={pageItem.id}
        layout={<SingleItemLayout />}
      >
        {({ error, loading, item, getItem }) => {
          return (
            <>
              {(!loading && (error || !item)) && (
                <div className="my-4">
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
              {isClassicWowhead && (
                <a
                  href={createNexushubLink(item as i.CachedItemDataClassic)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-2 place-items-center mt-4 q"
                >
                  More information on Nexushub.co <ExternalLinkSvg />
                </a>
              )}
            </>
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

export default ItemPageTooltip;
