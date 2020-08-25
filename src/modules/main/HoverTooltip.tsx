import React from 'react';
import ReactDOM from 'react-dom';

import getBodyElement from 'utils/getBodyElement';

import Tooltip from './tooltip';
import generateContainer from './generateContainer';
import { getItemNameFromUrl, isAuctionableItem } from './utils';


const HoverTooltip = (): JSX.Element | null => {
  const [containerEl, setContainerEl] = React.useState<HTMLElement>();
  const [itemName, setItemName] = React.useState<string>();
  const [visible, setVisible] = React.useState(false);


  function hide() {
    setVisible(false);
    setItemName(undefined);
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
            setContainerEl(container);
            triggerTooltip();

            // Stop observing DOM changes
            observer.disconnect();
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
      let itemName: string | undefined;

      // Look for item name in the URL
      if (node) {
        itemName = getItemNameFromUrl(node.href);
      }

      const whtt = document.querySelectorAll('.wowhead-tooltip')[1];

      // Check if item can be put on the AH
      if (!isAuctionableItem(whtt?.innerHTML)) {
        hide();

        return;
      }

      // Look for item name in tooltip body
      if (!itemName) {
        const selector = whtt?.querySelector('b') as HTMLElement | undefined;
        itemName = selector?.innerText;
      }

      if (itemName) {
        setVisible(true);
        setItemName(itemName);

        return;
      }

      hide();
    }, 50);
  };

  // Listen to bubbled events and check if we are targeting a link to an item
  // Event Delegation: https://davidwalsh.name/event-delegate
  function listenToItemLinkHover() {
    function onMouseOver(e: MouseEvent) {
      const target = e.target as HTMLAnchorElement;
      const parent = target.parentNode as HTMLAnchorElement;
      const selector = 'a[href*="item="]';

      if (target) {
        if (target.matches(selector) || parent.matches(selector)) {
          return triggerTooltip(target);
        }
      }

      setVisible(false);
      setItemName(undefined);
    }

    getBodyElement().addEventListener('mouseover', onMouseOver);

    return onMouseOver;
  }


  React.useEffect(() => {
    const cb = listenToItemLinkHover();

    // Wait for wowhead tooltip to be created
    const observer = observeWowheadTooltipCreate();


    return function cleanup() {
      observer.disconnect();
      getBodyElement().removeEventListener('mouseover', cb);
    };
  }, []);


  if (!itemName || !containerEl || !visible) {
    return null;
  }

  return ReactDOM.createPortal(
    <Tooltip itemName={itemName} />,
    containerEl,
  );
};

export default HoverTooltip;
