import React from 'react';
import ReactDOM from 'react-dom';
import { css } from '@emotion/css';

import getBodyElement from 'utils/getBodyElement';
import useKeybind from 'hooks/useKeybind';
import useGetItemFromPage from 'hooks/useGetItemFromPage';
import { useStore } from 'state/store';

import Tooltip from './tooltip';
import generateContainer from './generateContainer';


const HoverTooltip = (): React.ReactPortal | null => {
  const [containerEl, setContainerEl] = React.useState<HTMLElement>();
  const [hoverEl, setHoverEl] = React.useState<HTMLElement>();
  const [itemId, setItemId] = React.useState<number>();
  const [visible, setVisible] = React.useState(false);
  const [amount, setAmount] = React.useState(1);
  const shiftKeyPressed = useKeybind((key) => key.Shift);
  const showShiftKeyTip = useStore((store) => store?.storage?.showTip?.shiftKey);
  const saveToStorage = useStore((store) => store.storage.actions.save);
  const { getItemIdFromUrl, isAuctionableItem } = useGetItemFromPage();


  React.useEffect(() => {
    const cb = listenToItemLinkHover();

    // Wait for wowhead tooltip to be created
    const observer = observeWowheadTooltipCreate();


    return function cleanup() {
      observer.disconnect();
      getBodyElement().removeEventListener('mouseover', cb);
    };
  }, []);

  React.useEffect(() => {
    // Remove shift key tip if user has never pressed shift, has pressed shift and we hover an item with an amount shown
    if (showShiftKeyTip && shiftKeyPressed && hoverEl && getAmount() > 1) {
      saveToStorage('showTip', (draftState) => {
        if (draftState) {
          draftState.shiftKey = false;
        }
      });
    }
  }, [shiftKeyPressed]);

  React.useEffect(multiplyValue, [shiftKeyPressed, hoverEl]);


  function hide() {
    setVisible(false);
    setItemId(undefined);
    setHoverEl(undefined);
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
              setContainerEl(container);
              triggerTooltip();

              // Stop observing DOM changes
              observer.disconnect();
            }
          }
        }
      }
    });

    // Observe added/removed nodes to body and its children
    observer.observe(getBodyElement(), { childList: true });

    return observer;
  }

  // Set tooltip to visible and set item name
  function triggerTooltip(node?: HTMLAnchorElement) {
    setTimeout(() => {
      let itemId: number | undefined;

      // Look for item ID in the URL
      if (node) {
        itemId = getItemIdFromUrl(node.href);
      }


      // Look for item name in tooltip body
      const whttList = Array.from(document.querySelectorAll('.wowhead-tooltip'));
      for (const whtt of whttList) {
        // Check if item can be put on the AH
        if (!isAuctionableItem(whtt.innerHTML)) {
          hide();
          return;
        }

        if (itemId) {
          continue;
        }

        const id = whtt.id;

        if (id) {
          itemId = Number(id.replace('tt', ''));
        }
      }

      if (itemId) {
        setVisible(true);
        setItemId(itemId);
      } else {
        hide();
      }
    }, 50);
  }

  // Listen to bubbled events and check if we are targeting a link to an item
  // Event Delegation: https://davidwalsh.name/event-delegate
  function listenToItemLinkHover() {
    function onMouseOver(e: MouseEvent) {
      const target = e.target as HTMLAnchorElement;
      const parent = target.parentNode as HTMLAnchorElement;
      const selector = 'a[href*="item="]';

      if (target) {
        if (target.matches(selector) || parent.matches(selector)) {
          setHoverEl(target);
          triggerTooltip(target);

          return;
        }
      }

      hide();
    }

    getBodyElement().addEventListener('mouseover', onMouseOver);

    return onMouseOver;
  }

  function getAmount(): number {
    const parentEl = hoverEl?.parentNode as HTMLElement | undefined;
    const amtSelector = 'span.glow div:first-child';
    let amt = 1;

    if (parentEl?.className.includes('icon')) {
      amt = Number(parentEl.querySelector(amtSelector)?.innerHTML);
    } else {
      amt = Number(parentEl?.parentNode?.querySelector(amtSelector)?.innerHTML);
    }

    if (isNaN(amt)) {
      amt = 1;
    }

    return amt;
  }

  function multiplyValue() {
    if (!shiftKeyPressed) {
      return setAmount(1);
    }

    setAmount(getAmount());
  }

  if (!itemId || !containerEl || !visible) {
    return null;
  }

  return ReactDOM.createPortal(
    <Tooltip itemId={itemId} amount={amount}>
      {(() => showShiftKeyTip && getAmount() > 1 ? (
        <div className={'blizzard-blue ' + css`
          margin-top: 10px;
        `}>
          Tip: press shift to see the price for the stack!
        </div>
      ) : null)}
    </Tooltip>,
    containerEl,
  );
};

export default HoverTooltip;
