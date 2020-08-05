import React from 'react';
import * as i from '../../../types';

import api from '../../../utils/api';
import LoadingSvg from '../../../static/loading.svg';
import ExternalLinkSvg from '../../../static/external-link.svg';
import useAsyncStorage from '../../../hooks/useAsyncStorage';
import { SellPrice } from './SellPrice';

const PREFIX = 'auctionoton';
const ELEMENT_ID = {
  CONTAINER: `${PREFIX}-container`,
  TOOLTIP: `${PREFIX}-tooltip`,
};

const Tooltip: React.FC<Props> = (props) => {
  const [user] = useAsyncStorage('user');
  const [item, setItem] = React.useState<i.ItemData>();

  React.useMemo(() => {
    if (!user) {
      return;
    }

    // Remove item to hide current data and show loading animation
    setItem(undefined);

    // Get new item data
    api.getItem(props.itemName).then(setItem);
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <table id={ELEMENT_ID.TOOLTIP}>
      <tbody>
        <tr>
          <td>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td>
                    <span className="q whtt-extra whtt-ilvl">
                        Auction House Data for {user.server.name}-{user.faction}
                    </span>
                    <div className="whtt-sellprice" style={{ marginBottom: '10px' }}>
                      {!item ? <LoadingSvg /> : `Last updated: ${item.lastUpdated}`}
                    </div>
                  </td>
                </tr>
                {item && (
                  <tr>
                    <td>
                      <SellPrice heading="Market Value" value={item.marketValue} />
                      <SellPrice heading="Historical Value" value={item.historicalValue} />
                      <SellPrice heading="Minimum Buyout" value={item.minimumBuyout} />

                      <br />

                      <div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          More information on Nexushub.co <ExternalLinkSvg />
                        </a>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </td>

          <th style={{ backgroundPosition: 'top right' }} />
        </tr>

        <tr>
          <th style={{ backgroundPosition: 'bottom left' }} />
          <th style={{ backgroundPosition: 'bottom right' }} />
        </tr>
      </tbody>
    </table>
  );
};

type Props = {
  itemName: string;
}

export default Tooltip;
