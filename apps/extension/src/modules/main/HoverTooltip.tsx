import React from 'react';
import ReactDOM from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { Key } from 'w3c-keys';
import { useSnapshot } from 'valtio';

import getBodyElement from 'utils/getBodyElement';
import asyncStorage from 'utils/asyncStorage';
import useStorageQuery from 'hooks/useStorageQuery';
import useItemFromPage from 'hooks/useItemFromPage';

import { useEventListener } from 'hooks/useEventListener';
import Tooltip from './tooltip';
import generateContainer from './generateContainer';
import { uiState } from './state';

const HoverTooltip = (): React.ReactPortal | null => {
  const [itemId, setItemId] = React.useState<number>();
  const [visible, setVisible] = React.useState(false);
  const [amount, setAmount] = React.useState(1);
  const uiSnap = useSnapshot(uiState);
  const { data: ui } = useStorageQuery('ui');
  const { getItemIdFromUrl, getIsAuctionableItem } = useItemFromPage();
  const tooltipEl = React.useRef<HTMLElement | null>(null);
  const hoverEl = React.useRef<HTMLAnchorElement | null>(null);
  const hoverElObserver = React.useRef<MutationObserver | null>(null);
  const containerEl = React.useRef<HTMLElement | null>(null);
  const isAuctionableItem = getIsAuctionableItem(tooltipEl.current?.innerHTML);
  const uiMutation = useMutation({
    mutationFn: async () =>
      asyncStorage.set('ui', (draft) => {
        draft!.showTip.shiftKey = false;
      }),
  });

  const shiftKeyPressed = uiSnap.keys[Key.Shift];

  React.useEffect(() => {
    // Wait for wowhead tooltip to be created
    const observer = observeWowheadTooltipCreate();

    return function cleanup() {
      observer.disconnect();
      hoverElObserver.current?.disconnect();
    };
  }, []);

  React.useEffect(() => {
    if (
      itemId ||
      !visible ||
      !hoverEl.current ||
      !tooltipEl.current ||
      !hoverEl.current ||
      !isAuctionableItem
    ) {
      return;
    }

    // Look for item ID in the URL
    const MAX_DEPTH = 5;
    let depth = 0;
    let currentEl = hoverEl.current;
    while (currentEl && depth < MAX_DEPTH) {
      const itemId = getItemIdFromUrl(currentEl.href);

      if (itemId) {
        setItemId(itemId);
        setVisible(true);
        break;
      }

      currentEl = currentEl.parentNode as HTMLAnchorElement;
      depth++;
    }
  }, [visible, itemId]);

  React.useEffect(() => {
    // Remove shift key tip if user has never pressed shift, has pressed shift and we hover an item with an amount shown
    if (ui?.showTip.shiftKey && shiftKeyPressed && hoverEl.current && amount > 1) {
      uiMutation.mutate();
    }
  }, [ui?.showTip.shiftKey, shiftKeyPressed, hoverEl.current]);

  // Listen to bubbled events and check if we are targeting a link to an item
  // Event Delegation: https://davidwalsh.name/event-delegate
  useEventListener(
    'mouseover',
    (e: MouseEvent) => {
      const target = e.target as HTMLAnchorElement;
      const parent = target.parentNode as HTMLAnchorElement;
      const selector = 'a[href*="item="]';

      if (target) {
        if (target.matches(selector) || parent.matches(selector)) {
          hoverEl.current = target;

          setAmount(
            target.nextElementSibling?.textContent
              ? Number(target.nextElementSibling.textContent.trim())
              : 1,
          );
          return;
        }
      }

      hide();
    },
    getBodyElement(),
  );

  function hide() {
    setVisible(false);
    setItemId(undefined);
    hoverEl.current = null;
  }

  // Observe the creation of the wowhead tooltip container
  function observeWowheadTooltipCreate(): MutationObserver {
    const observer = new MutationObserver((mutations, observer) => {
      for (const mutation of mutations) {
        const nodes = Array.from(mutation.addedNodes) as HTMLElement[];

        for (const node of nodes) {
          if (node.classList.contains('wowhead-tooltip') && 'visible' in node.dataset) {
            // Generate and save a container for the tooltip
            const container = generateContainer(node, 'hover');

            if (container) {
              containerEl.current = container;
              tooltipEl.current = node;
              setVisible(true);

              // Stop observing DOM changes
              observer.disconnect();

              // Create Observer for the tooltip
              const tooltipObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                  const node = mutation.target as HTMLElement;

                  if (node.dataset.visible === 'yes') {
                    setVisible(node.dataset.visible === 'yes');
                  } else {
                    hide();
                  }
                }
              });

              tooltipObserver.observe(node, { attributeFilter: ['data-visible'] });
              hoverElObserver.current = tooltipObserver;
            }
          }
        }
      }
    });

    // Observe added/removed nodes to body and its children
    observer.observe(getBodyElement(), { childList: true });

    return observer;
  }

  if (!visible || !itemId || !containerEl.current || !hoverEl.current) {
    return null;
  }

  return ReactDOM.createPortal(
    <Tooltip itemId={itemId} amount={shiftKeyPressed ? amount : 1}>
      {ui?.showTip.shiftKey && amount > 1 ? (
        <div className="blizzard-blue auc-mt-2">
          Tip: press shift to see the price for the stack!
        </div>
      ) : null}
    </Tooltip>,
    containerEl.current,
  );
};

export default HoverTooltip;
