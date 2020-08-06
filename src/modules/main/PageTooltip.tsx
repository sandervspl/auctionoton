import React from 'react';
import ReactDOM from 'react-dom';

import Tooltip from './tooltip';
import getItemData from './getPageItem';
import generateContainer from './generateContainer';


const PageTooltip = (): JSX.Element => {
  const pageItem = React.useRef(getItemData());

  const tooltipElementId = `tt${pageItem.current.id}`;
  const tooltipElement = document.querySelector(`#${tooltipElementId}`) as HTMLElement;
  const container = React.useRef(generateContainer(tooltipElement));

  return ReactDOM.createPortal(
    <Tooltip itemName={pageItem.current.name} />,
    container.current,
  );
};

export default PageTooltip;
