import * as i from './types';
import asyncStorage from './asyncStorage';
import fetchItemData from './fetchItemData';

/**
 * @description Returns an HTML string for gold/silver/copper with styles
 */
const generateValueString = (valueObject: i.ValueObject): string => {
  return (Object.keys(valueObject) as (keyof i.ValueObject)[])
    .reduce((prev, key) => {
      if (valueObject[key] > 0) {
        prev.push(`<span class="money${key}">${valueObject[key]}</span>`);

        return prev;
      }

      return prev;
    }, [] as string[])
    .join(' ');
};

const generateTooltip = async (itemName: string): Promise<HTMLTableElement> => {
  // Get user data
  const { user } = await asyncStorage.get('user');

  // Get item data
  const data = await fetchItemData(itemName);

  // Build the container
  const container = document.createElement('table');

  const table = `
    <tbody>
      <tr>
        <td>
          <table style="width: 100%;">
            <tbody>
              <tr>
                <td>
                  <span class="q whtt-extra whtt-ilvl">
                    Auction House Data for ${user.server}-${user.faction}
                  </span>
                  <div class="whtt-sellprice" style="margin-bottom: 10px">
                    Last Updated: ${data.lastUpdated}
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div class="whtt-sellprice">
                    <div style="display:inline-block; width:112px">Market Value:</div>
                    ${generateValueString(data.marketValue)}
                  </div>
                  <div class="whtt-sellprice">
                    <div style="display:inline-block; width:112px">Historical Value:</div>
                    ${generateValueString(data.historicalValue)}
                  </div>
                  <div class="whtt-sellprice">
                    <div style="display:inline-block; width:112px">Minimum Buyout:</div>
                    ${generateValueString(data.minimumBuyout)}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
        
        <th style="background-position: top right"></th>
      </tr>
      
      <tr>
        <th style="background-position: bottom left"></th>
        <th style="background-position: bottom right"></th>
      </tr>
    </tbody>
  `;

  container.innerHTML = table;

  return container;
};

export default generateTooltip;
