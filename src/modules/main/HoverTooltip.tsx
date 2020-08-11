import React from 'react';
import ReactDOM from 'react-dom';

import getBodyElement from 'utils/getBodyElement';

import Tooltip from './tooltip';
import generateContainer from './generateContainer';
import { getItemNameFromUrl } from './getPageItem';


const HoverTooltip = (): JSX.Element | null => {
  const [containerEl, setContainerEl] = React.useState<HTMLElement>();
  const [wowheadTooltipEl, setWowheadTooltipEl] = React.useState<HTMLElement>();
  const [itemName, setItemName] = React.useState<string>();
  const [visible, setVisible] = React.useState(false);
  let timeoutId: number;


  // Observe the creation of the wowhead tooltip container
  function observeWowheadTooltipCreate(): MutationObserver {
    const observer = new MutationObserver((mutations, observer) => {
      for (const mutation of mutations) {
        const nodes = Array.from(mutation.addedNodes) as HTMLElement[];

        for (const node of nodes) {
          if (node.classList.contains('wowhead-tooltip') && 'visible' in node.dataset) {
            // Save wowhead tooltip node
            setWowheadTooltipEl(node);

            // Generate and save a container for the tooltip
            const container = generateContainer(node, 'hover');
            setContainerEl(container);

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

  // Align our tooltips' visibility with wowhead tooltips' visibility
  function observeWowheadTooltipVisibility(): MutationObserver {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const wowheadTooltip = mutation.target as HTMLElement;

        if (wowheadTooltip.dataset.visible === 'yes' && mutation.oldValue === 'no') {
          clearTimeout(timeoutId);
        }

        // Using timeout fixes an issue where the visible data value for the wowhead tooltip changes between no and yes rapidly
        if (wowheadTooltip.dataset.visible === 'no' && mutation.oldValue === 'yes') {
          timeoutId = setTimeout(() => setVisible(false));
        }
      }
    });

    // Observe changes to data-visible value
    observer.observe(wowheadTooltipEl!, {
      attributeFilter: ['data-visible'],
      attributeOldValue: true,
    });

    return observer;
  }

  // Set tooltip to visible and set item name
  function triggerTooltip(node: HTMLAnchorElement) {
    setVisible(true);

    const itemNameFromUrl = getItemNameFromUrl(node.href);

    if (itemNameFromUrl) {
      setItemName(itemNameFromUrl);
    } else {
      setTimeout(() => {
        const selector = document.querySelectorAll('.wowhead-tooltip table tr td > b')[1] as HTMLElement | undefined;
        const itemNameFromPage = selector?.innerText;

        if (itemNameFromPage) {
          setItemName(itemNameFromPage);
        }
      });
    }
  };

  // Listen to bubbled events and check if we are targeting a link to an item
  // Event Delegation: https://davidwalsh.name/event-delegate
  function listenToItemLinkHover() {
    function onMouseOver(e: MouseEvent) {
      const target = e.target as HTMLAnchorElement;

      if (target && target.matches('a[href*="item="]')) {
        triggerTooltip(target);
      }
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

  React.useEffect(() => {
    if (!wowheadTooltipEl) {
      return;
    }

    const observer = observeWowheadTooltipVisibility();

    return function cleanup() {
      observer.disconnect();
    };
  }, [wowheadTooltipEl]);


  if (!itemName || !containerEl || !visible) {
    return null;
  }

  return ReactDOM.createPortal(
    <Tooltip itemName={itemName} />,
    containerEl,
  );
};

export default HoverTooltip;
