import * as i from 'types';
import * as React from 'react';
import useStorageQuery from 'hooks/useStorageQuery';

import ExternalLinkSvg from 'static/external-link.svg';
import RedoSvg from 'static/redo-solid.svg';
import { useWowhead } from 'hooks/useWowhead';
import Tooltip from './tooltip';

type Props = {
  itemId: number;
};

export const ItemPriceTooltip = (props: Props) => {
  const { isClassic, version } = useWowhead();
  const { data: user } = useStorageQuery('user');

  function createNexushubLink(item: i.CachedItemDataClassic) {
    const server = user?.realms?.[version]?.slug;

    if (server) {
      const faction = user?.faction[server]?.toLowerCase();
      return `https://nexushub.co/wow-classic/items/${server}-${faction}/${item.uniqueName}`;
    }
  }

  return (
    <Tooltip itemId={props.itemId}>
      {({ error, loading, item, getItem }) => {
        return (
          <div className="mt-2">
            {!loading && error && !item && (
              <div className="mb-2">
                <button
                  className="btn btn-small btn"
                  onClick={() => getItem()}
                  title="Try loading item data again for Auctionoton"
                >
                  <RedoSvg className="h-2 pr-1" />
                  <span>Try again</span>
                </button>
              </div>
            )}
            {isClassic && user && item && 'stats' in item && (
              <a
                href={createNexushubLink(item as i.CachedItemDataClassic)!}
                target="_blank"
                rel="noopener noreferrer"
                className="q flex place-items-center gap-1"
              >
                More information on Nexushub.co <ExternalLinkSvg />
              </a>
            )}
          </div>
        );
      }}
    </Tooltip>
  );
};
