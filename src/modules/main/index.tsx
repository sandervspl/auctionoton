import React from 'react';
import ReactDOM from 'react-dom';

import { useStateApi } from 'state/store';
import { ELEMENT_ID } from 'src/constants';
import getBodyElement from 'utils/getBodyElement';

import Root from './Root';


async function main(): Promise<void> {
  // Initialize short term cache
  await useStateApi.getState().storage.actions.init();

  // Generate a root element for React to render on
  const rootElement = document.createElement('span');
  rootElement.id = ELEMENT_ID.ROOT;
  rootElement.style.display = 'none';

  getBodyElement().appendChild(rootElement);

  ReactDOM.render(<Root />, rootElement);
};

main();
