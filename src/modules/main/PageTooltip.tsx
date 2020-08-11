import React from 'react';
import ReactDOM from 'react-dom';

import ExternalLinkSvg from 'static/external-link.svg';

import Tooltip from './tooltip';
import getItemData from './getPageItem';
import generateContainer from './generateContainer';
import isValidItem from './isValidItem';


const PageTooltip = (): JSX.Element | null => {
  const pageItem = React.useRef(getItemData());

  const tooltipElementId = `tt${pageItem.current.id}`;
  const tooltipElement = document.querySelector(`#${tooltipElementId}`) as HTMLElement;
  const container = React.useRef(generateContainer(tooltipElement, 'page'));

  if (!isValidItem(tooltipElement.innerHTML)) {
    return null;
  }

  return ReactDOM.createPortal(
    <Tooltip itemName={pageItem.current.name}>
      {(item) => (
        <div style={{ marginTop: '10px' }}>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            More information on Nexushub.co <ExternalLinkSvg />
          </a>
        </div>
      )}
    </Tooltip>,
    container.current,
  );
};

export default PageTooltip;
