import React from 'react';
import ReactDOM from 'react-dom';

import generateContainer from './generateContainer';
import { getItemNameFromUrl } from './getPageItem';
import Tooltip from './tooltip';


const HoverTooltip = (props: Props): JSX.Element | null => {
  const container = React.useRef(generateContainer(props.parent));
  const [itemName, setItemName] = React.useState<string | undefined>();
  let timeoutId: number;

  function isVisible(): boolean {
    return container.current.style.display !== 'none';
  }

  function hide(): void {
    container.current.style.display = 'none';
  }

  React.useEffect(() => {
    // Helper functions
    function onMouseEnter(node: HTMLAnchorElement) {
      container.current.style.display = 'block';

      const itemNameFromUrl = getItemNameFromUrl(node.href);

      if (itemNameFromUrl) {
        setItemName(itemNameFromUrl);
      } else {
        const selector = document.querySelectorAll('.wowhead-tooltip table tr td > b')[1] as HTMLElement | undefined;
        const itemNameFromPage = selector?.innerText;

        if (itemNameFromPage) {
          setItemName(itemNameFromPage);
        }
      }
    }

    // Look for all anchors that link to items
    function addHoverToLinks() {
      const itemLinks = document.querySelectorAll('a[href*="item="]');
      const itemLinksArr = Array.from(itemLinks) as HTMLAnchorElement[];

      const onMouseEnterCb = (node: HTMLAnchorElement) => () => onMouseEnter(node);

      for (const link of itemLinksArr) {
        link.addEventListener('mouseenter', onMouseEnterCb(link));
      }
    }


    // Hide tooltip container on first render
    hide();


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


    // Observe floating wowhead tooltip for changes to its visibility
    const wowheadTooltipObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const wowheadTooltip = mutation.target as HTMLElement;

        // Using timeout fixes an issue where the visible data value for the wowhead tooltip changes between no and yes rapidly
        if (wowheadTooltip.dataset.visible === 'yes' && mutation.oldValue === 'no') {
          clearTimeout(timeoutId);
        }

        if (isVisible() && wowheadTooltip.dataset.visible === 'no') {
          timeoutId = setTimeout(hide);
        }
      }
    });

    wowheadTooltipObserver.observe(props.parent, {
      attributeFilter: ['data-visible'],
      attributeOldValue: true,
    });


    // Unmount
    return function cleanup() {
      observer.disconnect();
      wowheadTooltipObserver.disconnect();
    };
  }, []);

  if (!itemName) {
    return null;
  }

  return ReactDOM.createPortal(
    <Tooltip itemName={itemName} />,
    container.current,
  );
};

type Props = {
  parent: HTMLElement;
}

export default HoverTooltip;
