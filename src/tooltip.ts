import * as i from './types';
import AsyncStorage from './asyncStorage';
import API from './api';
import loadingSvg from './static/loading.svg';

abstract class Tooltip {
  private static PREFIX = 'auctionoton';
  private static ELEMENT_ID = {
    CONTAINER: `${Tooltip.PREFIX}-container`,
    TOOLTIP: `${Tooltip.PREFIX}-tooltip`,
  };

  static async generatePageTooltip(): Promise<void> {
    // Get item name
    const itemNameSearch = window.location.pathname.match(/item=\d+\/([\w\d-]+)/);

    if (!itemNameSearch) {
      console.error('No item name found');
      return;
    }

    const itemName = itemNameSearch[1];
    const pathname = window.location.pathname;
    const itemIdSearch = /\d+/.exec(pathname);

    if (!itemIdSearch) {
      console.error('No item id found');
      return;
    }

    const itemId = itemIdSearch[0];
    const tooltipElementId = `tt${itemId}`;
    const tooltipElement = document.querySelector(`#${tooltipElementId}`) as HTMLElement;

    if (!tooltipElement) {
      console.error('No tooltip element found');
      return;
    }

    // Get user data
    const user = await AsyncStorage.get('user');

    if (!user) {
      return;
    }

    // Remove existing tooltip
    const curContainer = document.querySelector(`#${Tooltip.ELEMENT_ID.CONTAINER}`);

    if (curContainer) {
      tooltipElement.removeChild(curContainer);
    }

    // Build the container
    const container = document.createElement('div');
    container.id = Tooltip.ELEMENT_ID.CONTAINER;
    container.style.position = 'relative';

    tooltipElement.appendChild(container);

    // Build the tooltip
    const tooltipWidth = tooltipElement.getBoundingClientRect().width;
    const minContainerWidth = 256;

    const tooltipContainer = document.createElement('table');
    tooltipContainer.id = Tooltip.ELEMENT_ID.TOOLTIP;
    tooltipContainer.style.width = 'auto';
    tooltipContainer.style.minWidth = tooltipWidth > minContainerWidth
      ? `${tooltipWidth}px`
      : `${minContainerWidth}px`;

    tooltipContainer.innerHTML = Tooltip.template(user);
    container.appendChild(tooltipContainer);

    // Get item data
    const data = await API.getItem(itemName);

    // Remove loading tooltip
    container.removeChild(tooltipContainer);

    if (!data) {
      console.error(`Error while fetching item '${itemName}'`);

      tooltipContainer.innerHTML = Tooltip.template(user, 'Unable to fetch item data. Try again later.');
      container.appendChild(tooltipContainer);

      return;
    }

    tooltipContainer.innerHTML = Tooltip.template(user, `Last updated: ${data.lastUpdated}`, `
      <tr>
        <td>
          <div class="whtt-sellprice" style="display:flex;justify-content:space-between">
            <div style="display:inline-block; width:112px">Market Value:</div>
            ${Tooltip.generateValueString(data.marketValue)}
          </div>
          <div class="whtt-sellprice" style="display:flex;justify-content:space-between">
            <div style="display:inline-block; width:112px">Historical Value:</div>
            ${Tooltip.generateValueString(data.historicalValue)}
          </div>
          <div class="whtt-sellprice" style="display:flex;justify-content:space-between">
            <div style="display:inline-block; width:112px">Minimum Buyout:</div>
            ${Tooltip.generateValueString(data.minimumBuyout)}
          </div>
        </td>
      </tr>
    `);

    container.appendChild(tooltipContainer);
  }

  private static template(user: i.UserData, lastUpdatedStr?: string, itemTemplate?: string): string {
    return `
      <tbody>
        <tr>
          <td>
            <table style="width: 100%;">
              <tbody>
                <tr>
                  <td>
                    <span class="q whtt-extra whtt-ilvl">
                      Auction House Data for ${user.server.name}-${user.faction}
                    </span>
                    <div class="whtt-sellprice" style="margin-bottom: 10px">
                      ${lastUpdatedStr || loadingSvg}
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
  }

  /**
   * @description Returns an HTML string for gold/silver/copper with icon
   */
  private static generateValueString(valueObject: i.ValueObject): string {
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
  }
}

export default Tooltip;
