import React from 'react';
import ReactDOM from 'react-dom';

import generateContainer from './generateContainer';
import { getItemNameFromUrl } from './getPageItem';
import Tooltip from './tooltip';


const HoverTooltip = (): JSX.Element | null => {
  const [containerEl, setContainerEl] = React.useState<HTMLElement>();
  const [wowheadTooltipEl, setWowheadTooltipEl] = React.useState<HTMLElement>();
  const [itemName, setItemName] = React.useState<string>();
  const [visible, setVisible] = React.useState(false);
  let timeoutId: number;


  function observeWowheadTooltipCreate(): MutationObserver {
    const bodyElement = document.querySelector('body') as HTMLBodyElement;

    const observer = new MutationObserver((mutations, observer) => {
      for (const mutation of mutations) {
        const nodes = Array.from(mutation.addedNodes) as HTMLElement[];

        for (const node of nodes) {
          if (node.classList.contains('wowhead-tooltip') && 'visible' in node.dataset) {
            // Save node for HoverTooltip
            setWowheadTooltipEl(node);

            const container = generateContainer(node, 'hover');
            setContainerEl(container);

            // Stop observing DOM changes
            observer.disconnect();
          }
        }
      }
    });

    // Observe added/removed nodes to body and its children
    observer.observe(bodyElement, { childList: true });

    return observer;
  }

  function observeWowheadTooltipVisibility(): MutationObserver {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const wowheadTooltip = mutation.target as HTMLElement;


        // Using timeout fixes an issue where the visible data value for the wowhead tooltip changes between no and yes rapidly
        if (wowheadTooltip.dataset.visible === 'yes' && mutation.oldValue === 'no') {
          clearTimeout(timeoutId);
        }

        if (wowheadTooltip.dataset.visible === 'no' && mutation.oldValue === 'yes') {
          timeoutId = setTimeout(() => setVisible(false));
        }
      }
    });

    observer.observe(wowheadTooltipEl!, {
      attributeFilter: ['data-visible'],
      attributeOldValue: true,
    });

    return observer;
  }

  function observeItemLinksCreate(): MutationObserver {
    function addHoverToLinks() {
      // Look for all anchors that link to items
      const itemLinks = document.querySelectorAll('a[href*="item="]');
      const itemLinksArr = Array.from(itemLinks) as HTMLAnchorElement[];

      function onMouseEnter(node: HTMLAnchorElement) {
        return function () {
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
      };

      for (const link of itemLinksArr) {
        link.addEventListener('mouseenter', onMouseEnter(link));
      }
    }


    // Add event listener for tooltip to item links
    addHoverToLinks();


    // Observe changes to DOM and add tooltip to new item links
    const bodyElement = document.querySelector('body') as HTMLBodyElement;
    const observer = new MutationObserver(() => {
      addHoverToLinks();
    });

    // Deep observe added/removed nodes
    observer.observe(bodyElement, {
      childList: true,
      subtree: true,
    });

    return observer;
  }

  React.useEffect(() => {
    const observer1 = observeWowheadTooltipCreate();
    const observer2 = observeItemLinksCreate();

    return function cleanup() {
      observer1.disconnect();
      observer2.disconnect();
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
