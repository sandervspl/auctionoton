import React from 'react';
import ReactDOM from 'react-dom';

import Root from './Root';


function main(): void {
  // Generate a root element for React to render on
  const bodyElement = document.getElementsByTagName('body')[0];
  const rootElement = document.createElement('span');
  rootElement.id = 'auctionoton-root';
  rootElement.style.display = 'none';

  bodyElement.appendChild(rootElement);

  ReactDOM.render(<Root />, rootElement);
};

window.onload = main;
