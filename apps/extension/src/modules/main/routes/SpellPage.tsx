import * as i from 'types';
import React from 'react';
import ReactDOM from 'react-dom';

import useSpellFromPage from 'hooks/useSpellFromPage';
import { useCraftableItemPage } from 'hooks/useCraftableItemPage';

import generateContainer from '../generateContainer';
import { ChangeRealmButton } from '../ChangeRealmButton';
import { CraftingCostTooltip } from '../CraftingCostTooltip';

export const SpellPage: React.FC = (props) => {
  const { spell: pageSpell } = useSpellFromPage();
  const tooltipElementId = `tt${pageSpell?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);
  const container = React.useMemo(() => {
    return tooltipElement ? generateContainer(tooltipElement, 'page') : null;
  }, [tooltipElement]);
  const { reagentItems } = useGetReagentItems();
  const { items, setCraftAmount } = useCraftableItemPage(reagentItems.map((item) => item.id));
  useWowheadAmountInput(setCraftAmount);

  if (!container) {
    return null;
  }

  // If there are no reagents, don't show the tooltip
  if (reagentItems.length === 0) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <div className="auc-h-2" />
      <p className="!auc-relative !auc-left-0 !auc-h-auto !auc-w-auto auc-text-[10px]">
        Auction House Prices for Wowhead
      </p>

      <CraftingCostTooltip
        reagentItems={reagentItems}
        items={items.map((item) => ({
          data: item.data,
          isLoading: item.isLoading || item.isFetching,
        }))}
      />

      <div className="auc-h-1" />
      <ChangeRealmButton />
    </>,
    container,
  );
};

function useGetReagentItems() {
  const reagentItems = React.useMemo(() => {
    const reagentsHeaderEl = document.querySelector('#icon-list-heading-reagents');
    if (!reagentsHeaderEl) {
      console.error('Could not find reagents header element');
      return [];
    }

    const reagentsTable = reagentsHeaderEl.nextElementSibling;
    if (!reagentsTable) {
      console.error('Could not find reagents table');
      return [];
    }

    // Get all anchors that:
    // - has a href that includes "item="
    // - has a classname that is "q<NUMBER>"
    // - is not in a <tr> that has 'style="display:none"'
    const reagentAnchors = reagentsTable.querySelectorAll<HTMLAnchorElement>(
      'tr:not([style*="display:none"]) a[href*="item="][class^="q"]',
    );

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
          const amountFromEl = amountEl.querySelector('span')?.textContent;

          if (amount) {
            amount = Number(amountFromEl);
          }
        }

        let icon = '';
        const iconEl = anchor.parentElement?.parentElement?.querySelector('ins');
        if (iconEl) {
          // get url from style background-image
          icon = iconEl.style.backgroundImage.replace(/url\("(.*)"\)/, '$1');
        }

        return { id, icon, amount };
      })
      .filter((item): item is i.ReagentItem => !!item?.id);

    if (reagentAnchors.length === 0) {
      if (__DEV__) {
        console.error('Could not find any reagent anchors');
      }

      return [];
    }

    return reagentItems;
  }, []);

  return {
    reagentItems,
  };
}

function useWowheadAmountInput(setCraftAmount: React.Dispatch<React.SetStateAction<number>>) {
  React.useEffect(() => {
    const amountInputEl = document.querySelector<HTMLInputElement>(
      '#icon-list-heading-reagents input',
    );
    if (!amountInputEl) {
      console.error('Could not find amount input element');
      return;
    }

    function onAmountChange(e: Event) {
      const value = Number((e.target as HTMLInputElement).value);
      setCraftAmount(value);
    }

    amountInputEl.addEventListener('change', onAmountChange);

    return () => {
      amountInputEl.removeEventListener('change', onAmountChange);
    };
  }, []);
}
