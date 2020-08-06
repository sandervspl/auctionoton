import * as i from 'types';
import React from 'react';

import api from 'utils/api';
import useAsyncStorage from 'hooks/useAsyncStorage';
import LoadingSvg from 'static/loading.svg';
import ExternalLinkSvg from 'static/external-link.svg';

import { SellPrice } from './SellPrice';


const PREFIX = 'auctionoton';
const ELEMENT_ID = {
  CONTAINER: `${PREFIX}-container`,
  TOOLTIP: `${PREFIX}-tooltip`,
};


const Tooltip = (props: Props): JSX.Element | null => {
  const [user] = useAsyncStorage('user');
  const [item, setItem] = React.useState<i.ItemData>();

  React.useMemo(() => {
    if (!user) {
      return;
    }

    // Remove item to hide current data and show loading animation
    setItem(undefined);
  }, [user]);

  // Get item data
  React.useEffect(() => {
    setItem(undefined);

    api.getItem(props.itemName).then(setItem);
  }, [props.itemName]);

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
