import React from 'react';
import { RecoilRoot } from 'recoil';

import PageTooltip from './PageTooltip';
import HoverTooltip from './HoverTooltip';

class App extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    return this.props.children;
  }
}


const Root = (): JSX.Element => {
  // List of rendered elements
  const [hoverParent, setHoverParent] = React.useState<HTMLElement>();

  // Wait for wowhead-tooltip element to be added to the DOM
  // Then save that node for the hover tooltip to append to
  React.useMemo(() => {
    const onMutation: MutationCallback = function (mutations, observer) {
      for (const mutation of mutations) {
        const nodes = Array.from(mutation.addedNodes) as HTMLElement[];

        for (const node of nodes) {
          if (node.classList.contains('wowhead-tooltip')) {
            // Save node for HoverTooltip
            setHoverParent(node);

            // Stop observing DOM changes
            observer.disconnect();
          }
        }
      }
    };

    // Observe changes to body
    const bodyElement = document.querySelector('body') as HTMLBodyElement;
    const observer = new MutationObserver(onMutation);

    // Only observe added/removed nodes
    observer.observe(bodyElement, { childList: true });
  }, []);

  const isItemPage = window.location.pathname.includes('item=');

  return (
    <RecoilRoot>
      <App>
        {isItemPage && <PageTooltip />}
        {hoverParent && <HoverTooltip parent={hoverParent} />}
      </App>
    </RecoilRoot>
  );
};

export default Root;
