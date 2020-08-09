import React from 'react';
import ReactDOM from 'react-dom';

import { storageStoreApi } from 'state/storage';
import { ELEMENT_ID } from 'src/constants';

import Root from './Root';


async function main(): Promise<void> {
  // Initialize short term cache
  await storageStoreApi.getState().init();

  // Generate a root element for React to render on
  const bodyElement = document.getElementsByTagName('body')[0];
  const rootElement = document.createElement('span');
  rootElement.id = ELEMENT_ID.ROOT;
  rootElement.style.display = 'none';

  bodyElement.appendChild(rootElement);

  ReactDOM.render(<Root />, rootElement);
};

main();
