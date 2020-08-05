import React from 'react';
import ReactDOM from 'react-dom';

import Tooltip from './tooltip';


window.onload = function (): void {
  // Get item name
  const itemNameSearch = window.location.pathname.match(/item=\d+\/([\w\d-]+)/);

  if (!itemNameSearch) {
    console.error('No item name found');
    return;
  }

  const itemName = itemNameSearch[1];
  const pathname = window.location.pathname;
  const itemIdSearch = /\d+/.exec(pathname);

  if (!itemIdSearch) {
    console.error('No item id found');
    return;
  }

  const itemId = itemIdSearch[0];
  const tooltipElementId = `tt${itemId}`;
  const tooltipElement = document.querySelector(`#${tooltipElementId}`) as HTMLElement;

  const tooltipWidth = tooltipElement.getBoundingClientRect().width;
  const minContainerWidth = 256;

  const container = document.createElement('div');
  container.id = 'auctionoton-container';
  container.style.position = 'relative';
  container.style.width = 'auto';
  container.style.minWidth = tooltipWidth > minContainerWidth
    ? `${tooltipWidth}px`
    : `${minContainerWidth}px`;

  tooltipElement.appendChild(container);

  ReactDOM.render(<Tooltip itemName={itemName} />, container);
};
