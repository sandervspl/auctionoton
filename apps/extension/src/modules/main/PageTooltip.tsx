/* eslint-disable jsx-a11y/anchor-is-valid */
import type * as i from 'types';
import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';

import ExternalLinkSvg from 'static/external-link.svg';
import RedoSvg from 'static/redo-solid.svg';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import useGetItemFromPage from 'hooks/useGetItemFromPage';
import useStorageQuery from 'hooks/useStorageQuery';

import Tooltip from './tooltip';
import generateContainer from './generateContainer';
import { Tabs } from './Tabs';
import { ChangeRealmButton } from './ChangeRealmButton';
import { ReagentsTooltip } from './ReagentsTooltip';

const tabs = ['Item price', 'Crafting price'];

const PageTooltip = (): React.ReactPortal | null => {
  const isClassicWowhead = useIsClassicWowhead();
  const { item: pageItem, isAuctionableItem, isCraftableItem } = useGetItemFromPage();
  const { data: user } = useStorageQuery('user');
  const [activeTab, setActiveTab] = React.useState(0);

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

      {isCraftableItem && <Tabs tabs={tabs} onTabChange={setActiveTab} />}

      {activeTab === 0 && (
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
                    More information on Nexushub.co <ExternalLinkSvg />
                  </a>
                )}
              </div>
            );
          }}
        </Tooltip>
      )}

      {activeTab === 1 && <ReagentsTooltip />}

      <div className="auc-h-1" />

      <ChangeRealmButton />
    </>,
    container,
  );
};

export default PageTooltip;
