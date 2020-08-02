import * as i from './types';
import React from 'react';

import asyncStorage from './asyncStorage';
import api from './api';
import LoadingSvg from './static/loading.svg';
import ExternalLinkSvg from './static/external-link.svg';

const PREFIX = 'auctionoton';
const ELEMENT_ID = {
  CONTAINER: `${PREFIX}-container`,
  TOOLTIP: `${PREFIX}-tooltip`,
};

const Tooltip: React.FC<Props> = (props) => {
  const [item, setItem] = React.useState<i.ItemData>();
  const [user, setUser] = React.useState<i.UserData>();

  React.useEffect(() => {
    api.getItem(props.itemName).then(setItem);
    asyncStorage.get('user').then(setUser);
  }, []);

  const generateValueString = function (valueObject: i.ValueObject): JSX.Element {
    const arr: JSX.Element[] = [];
    const style: React.CSSProperties = {};

    if (valueObject.gold > 0) {
      if (valueObject.silver > 0 || valueObject.copper > 0) {
        style.marginRight = 5;
      }

      arr.push(<span key="gold" className="moneygold" style={style}>{valueObject.gold}</span>);
    }

    if (valueObject.silver > 0) {
      if (valueObject.copper > 0) {
        style.marginRight = 5;
      }

      arr.push(<span key="silver" className="moneysilver" style={style}>{valueObject.silver}</span>);
    }

    if (valueObject.copper > 0) {
      arr.push(<span key="copper" className="moneycopper">{valueObject.copper}</span>);
    }

    return arr.length > 0
      ? <span>{arr}</span>
      : <span style={{ color: '#b9b9b9' }}>N/A</span>;
  };

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
                        Auction House Data for {user?.server.name}-{user?.faction}
                    </span>
                    <div className="whtt-sellprice" style={{ marginBottom: '10px' }}>
                      {item ? `Last updated: ${item.lastUpdated}` : <LoadingSvg />}
                    </div>
                  </td>
                </tr>
                {item && (
                  <tr>
                    <td>
                      <div
                        className="whtt-sellprice"
                        style={{ display:'flex', justifyContent:'space-between' }}
                      >
                        <div style={{ display:'inline-block', width:'112px' }}>
                            Market Value:
                        </div>
                        {generateValueString(item.marketValue)}
                      </div>
                      <div
                        className="whtt-sellprice"
                        style={{ display:'flex', justifyContent:'space-between' }}
                      >
                        <div style={{ display:'inline-block', width:'112px' }}>
                          Historical Value:
                        </div>
                        {generateValueString(item.historicalValue)}
                      </div>
                      <div className="whtt-sellprice" style={{ display:'flex',justifyContent:'space-between' }}>
                        <div style={{ display:'inline-block', width:'112px' }}>
                          Minimum Buyout:
                        </div>
                        {generateValueString(item.minimumBuyout)}
                      </div>

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
