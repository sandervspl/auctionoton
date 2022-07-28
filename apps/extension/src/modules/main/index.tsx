import React from 'react';
import ReactDOM from 'react-dom/client';

import { ELEMENT_ID } from 'src/constants';
import getBodyElement from 'utils/getBodyElement';

import Root from './Root';


async function main(): Promise<void> {
  // Generate a root element for React to render on
  const rootElement = document.createElement('span');
  rootElement.id = ELEMENT_ID.ROOT;

  getBodyElement().appendChild(rootElement);

  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(<Root />);
  }
}

main();
