import React from 'react';
import ReactDOM from 'react-dom';

import useGetSpellFromPage from 'hooks/useGetSpellFromPage';
import { useCraftableItemPage } from 'hooks/useCraftableItemPage';
import generateContainer from '../generateContainer';
import { ChangeRealmButton } from '../ChangeRealmButton';
import { CraftingCostTooltip } from '../CraftingCostTooltip';

export const SpellPage: React.FC = (props) => {
  const { spell: pageSpell } = useGetSpellFromPage();
  const tooltipElementId = `tt${pageSpell?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);
  const container = React.useMemo(() => {
    return tooltipElement ? generateContainer(tooltipElement, 'page') : null;
  }, [tooltipElement]);
  const { reagentItemIds, reagentsAmountMap } = useGetReagentItemIds();
  const { items, craftAmount, setCraftAmount } = useCraftableItemPage(reagentItemIds);
  useWowheadAmountInput(setCraftAmount);

  if (!container) {
    return null;
  }

  // If there are no reagents, don't show the tooltip
  if (reagentItemIds.length === 0) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <div className="auc-h-2" />
      <p className="!auc-relative !auc-left-0 !auc-h-auto !auc-w-auto auc-text-[10px]">
        Auction House Prices for Wowhead
      </p>

      <CraftingCostTooltip
        items={items.data}
        isLoading={items.isLoading}
        reagentAmountMap={reagentsAmountMap}
        craftAmount={craftAmount}
      />

      <div className="auc-h-1" />
      <ChangeRealmButton />
    </>,
    container,
  );
};

function useGetReagentItemIds() {
  const [reagentsAmountMap, setReagentsAmountMap] = React.useState<Map<number, number>>(new Map());
  const reagentItemIds = React.useMemo(() => {
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

    const reagentItemIds = Array.from(reagentAnchors)
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

        const amountEl = anchor.nextElementSibling;
        if (amountEl) {
          const amount = amountEl.querySelector('span')?.textContent;

          if (amount) {
            setReagentsAmountMap((map) => {
              map.set(id, Number(amount));
              return map;
            });
          }
        }

        return id;
      })
      .filter((id): id is number => !!id);

    if (reagentAnchors.length === 0) {
      if (__DEV__) {
        console.error('Could not find any reagent anchors');
      }

      return [];
    }

    const uniqueItemIds = new Set(reagentItemIds);

    return Array.from(uniqueItemIds);
  }, []);

  return {
    reagentItemIds,
    reagentsAmountMap,
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
