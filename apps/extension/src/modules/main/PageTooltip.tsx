import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';
import { css } from '@emotion/css';

import ExternalLinkSvg from 'static/external-link.svg';
import RedoSvg from 'static/redo-solid.svg';
import GlobeSvg from 'static/globe-americas-regular.svg';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import useGetItemFromPage from 'hooks/useGetItemFromPage';

import Tooltip from './tooltip';
import generateContainer from './generateContainer';


const PageTooltip = (): React.ReactPortal | null => {
  const isClassicWowhead = useIsClassicWowhead();
  const { item: pageItem, isAuctionableItem, nexushubUrl } = useGetItemFromPage();

  const tooltipElementId = `tt${pageItem?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);

  if (!tooltipElement) {
    return null;
  }

  const container = generateContainer(tooltipElement, 'page');

  if (!container || !pageItem) {
    return null;
  }

  if (!isAuctionableItem(tooltipElement.innerHTML)) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <Tooltip itemId={pageItem.id}>
        {({ error, loading, item, getItem }) => (
          <div className={css`
            margin-top: 10px;
          `}>
            {((error && !loading) || (!item)) && (
              <div className={css`
                margin-bottom: 10px;
              `}>
                <button
                  className="btn btn-small"
                  onClick={() => getItem()}
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
            {isClassicWowhead && nexushubUrl && (
              <a
                href={nexushubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                More information on Nexushub.co <ExternalLinkSvg />
              </a>
            )}
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
    container,
  );
};

export default PageTooltip;
