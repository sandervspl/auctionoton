import * as i from 'types';
import * as React from 'react';
import { ExternalLinkIcon, RotateCwIcon } from 'lucide-react';

import useStorageQuery from '@/hooks/useStorageQuery';
import { useWowhead } from '@/hooks/useWowhead';

import Tooltip from './tooltip';

type Props = {
  itemId: number;
  auctionHouseId: number;
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
    <Tooltip itemId={props.itemId} auctionHouseId={props.auctionHouseId}>
      {({ error, loading, item, getItem }) => {
        return (
          <div className="auc-mt-2">
            {!loading && error && !item && (
              <div className="auc-mb-2">
                <button
                  type="button"
                  className="btn btn-small btn"
                  onClick={() => getItem()}
                  title="Try loading item data again for Auctionoton"
                >
                  <RotateCwIcon className="auc-h-2 auc-pr-1" />
                  <span>Try again</span>
                </button>
              </div>
            )}
            {isClassic && user && item && 'stats' in item && (
              <a
                href={createNexushubLink(item as i.CachedItemDataClassic)!}
                target="_blank"
                rel="noopener noreferrer"
                className="auc-q auc-flex auc-place-items-center auc-gap-1"
              >
                More information on Nexushub.co
                <ExternalLinkIcon />
              </a>
            )}
          </div>
        );
      }}
    </Tooltip>
  );
};
