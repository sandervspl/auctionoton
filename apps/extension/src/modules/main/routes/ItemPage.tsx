import 'typed-query-selector';
import * as i from 'types';
import React from 'react';
import ReactDOM from 'react-dom';

import useItemFromPage from 'hooks/useItemFromPage';

import { useCraftableItemPage } from 'hooks/useCraftableItemPage';
import generateContainer from '../generateContainer';
import { Tabs } from '../Tabs';
import { ChangeRealmButton } from '../ChangeRealmButton';
import { ItemPriceTooltip } from '../ItemPriceTooltip';
import { CraftingCostTooltip } from '../CraftingCostTooltip';

const tabs = ['Item price', 'Crafting price'];

export const ItemPage = (): React.ReactPortal | null => {
  const { item: pageItem, getIsAuctionableItem, isCraftableItem } = useItemFromPage();
  const tooltipElementId = `tt${pageItem?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);
  const isAuctionableItem = getIsAuctionableItem(tooltipElement?.innerHTML);
  const showTabs = isCraftableItem && isAuctionableItem;
  const [activeTab, setActiveTab] = React.useState(isAuctionableItem ? 0 : 1);
  const { reagentItems } = useGetReagentItems();
  const { items } = useCraftableItemPage(reagentItems.map((item) => item.id));

  if (!tooltipElement) {
    return null;
  }

  const container = generateContainer(tooltipElement, 'page');

  if (!container || !pageItem) {
    return null;
  }

  if (!isAuctionableItem && !isCraftableItem) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <div className="auc-h-2" />
      <p className="!auc-relative !auc-left-0 !auc-h-auto !auc-w-auto auc-text-[10px]">
        Auction House Prices for Wowhead
      </p>

      {showTabs && <Tabs tabs={tabs} onTabChange={setActiveTab} />}
      {activeTab === 0 && <ItemPriceTooltip itemId={pageItem.id} />}
      {activeTab === 1 && (
        <CraftingCostTooltip
          reagentItems={reagentItems}
          items={items.data}
          isLoading={items.isLoading}
        />
      )}

      <div className="auc-h-1" />
      <ChangeRealmButton />
    </>,
    container,
  );
};

function useGetReagentItems() {
  const reagentItems: i.ReagentItem[] = React.useMemo(() => {
    const createdByTabEl = document.querySelector('#tab-created-by-spell');
    if (!createdByTabEl) {
      if (__DEV__) {
        console.error('Could not find "created by" tab');
      }
      return [];
    }

    // Click the tab to load the reagents
    const createdByTabAnchor = document.querySelector(
      'a[href="#created-by-spell"',
    ) as HTMLAnchorElement;
    if (!createdByTabAnchor) {
      if (__DEV__) {
        console.error('Could not find "created by" tab anchor');
      }
      return [];
    }

    // Click "created by" to load reagents into DOM and then click back to first tab
    createdByTabAnchor.click();
    Promise.resolve().then(() =>
      createdByTabAnchor.parentNode?.parentNode?.querySelector('li a')?.click(),
    );

    // Super scuffed selector
    const reagentsListEl = createdByTabEl
      .querySelector('.listview-row')
      ?.querySelector('td[style="padding: 0px;"]');
    if (!reagentsListEl) {
      console.error('Could not find reagents list');
      return [];
    }

    const reagentAnchors = reagentsListEl.querySelectorAll('a[href*="item="]');
    if (reagentAnchors.length === 0) {
      console.error('Could not find any reagent anchors');
      return [];
    }

    const reagentItems = Array.from(reagentAnchors)
      .map((anchor) => {
        const href = anchor.getAttribute('href');
        if (!href) {
          console.error('Could not find href on reagent anchor');
          return null;
        }

        const match = href.match(/item=(\d+)/);
        if (!match) {
          console.error('Could not find item id in href');
          return null;
        }

        const id = Number(match[1]);

        let amount = 1;
        const amountEl = anchor.nextElementSibling;
        if (amountEl) {
          const amountFromEl = amountEl.textContent;

          if (amountFromEl) {
            amount = Number(amountFromEl);
          }
        }

        let icon = '';
        const iconEl = anchor.parentElement?.querySelector('ins');
        if (iconEl) {
          // get url from style background-image
          icon = iconEl.style.backgroundImage.replace(/url\("(.*)"\)/, '$1');
        }

        return { id, icon, amount };
      })
      .filter((item): item is i.ReagentItem => !!item?.id);

    return reagentItems;
  }, []);

  return {
    reagentItems,
  };
}
