import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';

import useGetItemFromPage from 'hooks/useGetItemFromPage';

import { useCraftableItemPage } from 'hooks/useCraftableItemPage';
import generateContainer from '../generateContainer';
import { Tabs } from '../Tabs';
import { ChangeRealmButton } from '../ChangeRealmButton';
import { ItemPriceTooltip } from '../ItemPriceTooltip';
import { CraftingCostTooltip } from '../CraftingCostTooltip';

const tabs = ['Item price', 'Crafting price'];

export const ItemPage = (): React.ReactPortal | null => {
  const { item: pageItem, getIsAuctionableItem, isCraftableItem } = useGetItemFromPage();
  const tooltipElementId = `tt${pageItem?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);
  const isAuctionableItem = getIsAuctionableItem(tooltipElement?.innerHTML);
  const showTabs = isCraftableItem && isAuctionableItem;
  const [activeTab, setActiveTab] = React.useState(isAuctionableItem ? 0 : 1);
  const { reagentItems } = useGetReagentItemIds();
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

type Item = {
  id: number;
  icon: string;
  amount: number;
};

function useGetReagentItemIds() {
  const reagentItems: Item[] = React.useMemo(() => {
    const createdByTabEl = document.querySelector('#tab-created-by-spell');
    if (!createdByTabEl) {
      if (__DEV__) {
        console.error('Could not find "created by" tab');
      }
      return [];
    }

    const reagentsListEl = createdByTabEl.querySelector('.listview-row')?.querySelectorAll('td')[2];
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
      .filter((item): item is Item => !!item?.id);

    // const uniqueItemIds = new Set(reagentItemIds);

    return reagentItems;
  }, []);

  return {
    reagentItems,
  };
}
