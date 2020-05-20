import * as i from './types';
import AsyncStorage from './asyncStorage';
import API from './fetchItemData';
import loadingSvg from './static/loading.svg';

/**
 * @description Returns an HTML string for gold/silver/copper with icon
 */
const generateValueString = (valueObject: i.ValueObject): string => {
  const strArr = [];

  if (valueObject.gold > 0) {
    strArr.push(`<span class="moneygold">${valueObject.gold}</span>`);
  }
  if (valueObject.silver > 0) {
    strArr.push(`<span class="moneysilver">${valueObject.silver}</span>`);
  }
  if (valueObject.copper > 0) {
    strArr.push(`<span class="moneycopper">${valueObject.copper}</span>`);
  }

  return strArr.length > 0
    ? `<span>${strArr.join(' ')}</span>`
    : '<span style="color:#b9b9b9">N/A</span>';
};

const tooltipTemplate = (user: i.UserData, lastUpdatedStr?: string, itemTemplate?: string): string => `
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
                  ${lastUpdatedStr
                    ? `Last updated: ${lastUpdatedStr}`
                    : loadingSvg
                  }
                </div>
              </td>
            </tr>
            ${itemTemplate || ''}
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

const generateTooltip = async (parentElement: HTMLElement, itemName: string): Promise<HTMLTableElement | undefined> => {
  // Get user data
  const user = await AsyncStorage.get('user');

  if (!user) {
    return;
  }

  // Build the container
  const container = document.createElement('table');
  container.style.width = '100%';

  container.innerHTML = tooltipTemplate(user);
  parentElement.appendChild(container);

  // Get item data
  const data = await API.fetchItemData(itemName);

  if (!user || !data) {
    console.error('No user or item data present to create AH data');
    return;
  }

  // Remove loading tooltip
  parentElement.removeChild(container);

  container.innerHTML = tooltipTemplate(user, data.lastUpdated, `
    <tr>
      <td>
        <div class="whtt-sellprice" style="display:flex;justify-content:space-between">
          <div style="display:inline-block; width:112px">Market Value:</div>
          ${generateValueString(data.marketValue)}
        </div>
        <div class="whtt-sellprice" style="display:flex;justify-content:space-between">
          <div style="display:inline-block; width:112px">Historical Value:</div>
          ${generateValueString(data.historicalValue)}
        </div>
        <div class="whtt-sellprice" style="display:flex;justify-content:space-between">
          <div style="display:inline-block; width:112px">Minimum Buyout:</div>
          ${generateValueString(data.minimumBuyout)}
        </div>
      </td>
    </tr>
  `);

  parentElement.appendChild(container);

  return container;
};

export default generateTooltip;
