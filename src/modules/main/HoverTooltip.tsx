import React from 'react';
import ReactDOM from 'react-dom';

import generateContainer from './generateContainer';
import { getItemNameFromUrl } from './getPageItem';
import Tooltip from './tooltip';


const HoverTooltip = (props: Props): JSX.Element | null => {
  const container = React.useRef(generateContainer(props.parent));
  const [itemName, setItemName] = React.useState<string | undefined>();

  React.useEffect(() => {
    // Helper functions
    function onMouseEnter(node: HTMLAnchorElement) {
      container.current.style.display = 'block';

      const itemNameFromUrl = getItemNameFromUrl(node.href);

      if (itemNameFromUrl) {
        setItemName(itemNameFromUrl);
      }
    }

    function onMouseOut() {
      container.current.style.display = 'none';
    }

    function addHoverToLinks() {
      // Look for all anchors that link to items
      const itemLinks = document.querySelectorAll('a[href*="item="]');
      const itemLinksArr = Array.from(itemLinks) as HTMLAnchorElement[];

      const onMouseEnterCb = (node: HTMLAnchorElement) => () => onMouseEnter(node);

      for (const link of itemLinksArr) {
        link.addEventListener('mouseenter', onMouseEnterCb(link));
        link.addEventListener('mouseout', onMouseOut);
      }
    }


    // Hide tooltip container on first render
    container.current.style.display = 'none';


    // Add tooltip to item links
    addHoverToLinks();


    // Observe changes to DOM and add tooltip to new item links
    const onMutation: MutationCallback = function () {
      addHoverToLinks();
    };

    const bodyElement = document.querySelector('body') as HTMLBodyElement;
    const observer = new MutationObserver(onMutation);

    // Only observe added/removed nodes
    observer.observe(bodyElement, { childList: true, subtree: true });


    // Unmount
    return function cleanup() {
      observer.disconnect();
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
  parent: Element;
}

export default HoverTooltip;
