import React from 'react';
import ReactDOM from 'react-dom';
import { css } from '@emotion/css';

import ExternalLinkSvg from 'static/external-link.svg';
import RedoSvg from 'static/redo-solid.svg';
import GlobeSvg from 'static/globe-americas-regular.svg';

import Tooltip from './tooltip';
import { generateUrl, getItemFromPage, isAuctionableItem } from './utils';
import generateContainer from './generateContainer';


const PageTooltip = (): JSX.Element | null => {
  const pageItem = React.useRef(getItemFromPage());

  const tooltipElementId = `tt${pageItem.current.id}`;
  const tooltipElement = document.querySelector(`#${tooltipElementId}`) as HTMLElement;
  const container = React.useRef(generateContainer(tooltipElement, 'page'));

  const itemName = tooltipElement.innerHTML;

  if (!isAuctionableItem(itemName)) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <Tooltip itemName={pageItem.current.name}>
        {({ error, loading, getItem }) => (
          <div className={css`
            margin-top: 10px;
          `}>
            {(error && !loading) && (
              <div className={css`
                margin-bottom: 10px;
              `}>
                <button
                  className="btn btn-small"
                  onClick={getItem}
                  title="Try loading item data again for Auctionoton"
                >
                  <RedoSvg className={css`
                    padding-right: 5px;
                    height: 10px;
                  `} />
                  Try again
                </button>
              </div>
            )}
            <a href={generateUrl(pageItem.current.name)} target="_blank" rel="noopener noreferrer">
              More information on Nexushub.co <ExternalLinkSvg />
            </a>
          </div>
        )}
      </Tooltip>
      <button
        className={'btn btn-small ' + css`
          display: flex;
          align-items: center;
          margin-top: 5px;
        `}
        onClick={() => window.open(`${addon.extension.getURL('form.html')}?large=true`)}
        title="Change server for Auctionoton"
      >
        <GlobeSvg className={css`
          padding-right: 5px;
          height: 12px;
        `} />
          Change realm
      </button>
    </>,
    container.current,
  );
};

export default PageTooltip;
