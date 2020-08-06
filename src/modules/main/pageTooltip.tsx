import React from 'react';
import ReactDOM from 'react-dom';

import Tooltip from './tooltip';
import getItemData from './getItemData';
import generateContainer from './generateContainer';


function pageTooltip(): React.ReactPortal {
  const item = getItemData();
  const tooltipElementId = `tt${item.id}`;
  const tooltipElement = document.querySelector(`#${tooltipElementId}`) as HTMLElement;

  const container = generateContainer(tooltipElement);
  const pageTooltip = ReactDOM.createPortal(<Tooltip itemName={item.name} />, container);

  return pageTooltip;
}

export default pageTooltip;
