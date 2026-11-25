import './style.css';
import * as React from 'react';
import ReactDOM from 'react-dom/client';

import { ELEMENT_ID } from '@/constants';
import generateContainer from '@/modules/main/generateContainer';
import { Root } from '@/modules/main/Root';

function getItemIdFromUrl(url?: string): number | undefined {
  const match = url?.match(/item=(\d+)/);

  if (match) {
    return Number(match[1]);
  }
}

export default defineContentScript({
  matches: [
    'https://wowhead.com/tbc/*',
    'https://www.wowhead.com/tbc/*',
    'https://wowhead.com/mop-classic/*',
    'https://www.wowhead.com/mop-classic/*',
    'https://wowhead.com/classic/*',
    'https://www.wowhead.com/classic/*',
    'https://wowhead.com/forever/*',
    'https://www.wowhead.com/forever/*',
  ],
  main: async (ctx) => {
    const itemId = getItemIdFromUrl(window.location.pathname);
    const tooltipElementId = `tt${itemId}`;
    const tooltipElement = document.querySelector(`div#${tooltipElementId}`);
    const container = generateContainer(tooltipElement, 'page');

    const ui = createIntegratedUi(ctx, {
      position: 'inline',
      anchor: container,
      onMount: () => {
        // Generate a root element for React to render on
        const wrapper = document.createElement('span');
        wrapper.id = ELEMENT_ID.ROOT;
        getBodyElement().append(wrapper);

        if (!wrapper) {
          console.error('Could not find root element');
          return;
        }

        const root = ReactDOM.createRoot(wrapper);
        root.render(<Root />);

        return { root, wrapper };
      },
      onRemove: (elements) => {
        elements?.root.unmount();
        elements?.wrapper.remove();
      },
    });

    ui.mount();
  },
});
