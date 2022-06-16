import 'typed-query-selector';
import React from 'react';
import ReactDOM from 'react-dom';

import RedoSvg from 'static/redo-solid.svg';
import GlobeSvg from 'static/globe-americas-regular.svg';
import useGetPageData from 'hooks/useGetPageData';
import useStorageQuery from 'hooks/useStorageQuery';

import Tooltip from './tooltip';
import generateContainer from './generateContainer';
import MultiItemSumLayout from './layouts/MultiItemSumLayout';


const SpellPageTooltip = (): React.ReactPortal | null => {
  const { data: spell } = useGetPageData();
  const { data: user } = useStorageQuery('user');

  const reagents = React.useMemo(() => {
    // Grab reagent elements from the page
    const elements = Array.from(
      document.querySelectorAll(
        '#icon-list-reagents > tbody > tr > td:not([style^="padding"]) > a[href^="/item"]',
      ),
    );

    const items = [];
    for (const el of elements) {
      items.push({
        name: el.innerText,
        className: el.className,
      });
    }

    return items;
  }, []);

  const tooltipElementId = `tt${spell?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);

  if (!tooltipElement) {
    return null;
  }

  const container = generateContainer(tooltipElement, 'page');

  if (!container || !spell) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <Tooltip layout={<MultiItemSumLayout items={reagents} />}>
        {({ error, loading, item, getItem }) => {
          return (
            <div className="mt-2">
              {(!loading && (error || !item)) && (
                <div className="mb-2">
                  <button
                    className="btn btn-small"
                    onClick={() => getItem()}
                    title="Try loading item data again for Auctionoton"
                  >
                    <RedoSvg className="pr-1 h-2" />
                    <span>Try again</span>
                  </button>
                </div>
              )}
            </div>
          );
        }}
      </Tooltip>

      <div className="h-1" />

      <button
        className="btn btn-small"
        onClick={() => window.open(`${addon.extension.getURL('form.html')}?large=true`)}
        title="Change server for Auctionoton"
      >
        <GlobeSvg className="pr-1 h-3" />
        <span>{!user?.version ? 'Add your realm!' : 'Change realm'}</span>
      </button>
    </>,
    container,
  );
};

export default SpellPageTooltip;
