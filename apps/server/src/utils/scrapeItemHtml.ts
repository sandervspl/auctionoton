import * as i from 'types';
import * as HtmlParser from 'htmlparser2';


export const isDownError: i.FetchError = {
  error: true,
  reason: 'Nexushub appears to be down.',
};

export const notFoundError: i.FetchError = {
  error: true,
  reason: 'Item could not be found.',
};


export default function scrapeItemHtml(html: string): i.ItemScrapeResponse | i.FetchError | undefined {
  let error: i.FetchError = {
    error: false,
    reason: '',
  };
  let foundItemData = false;

  // Default data structure
  const data: i.ItemScrapeResponse = {
    id: -1,
    url: '',
    name: {
      slug: '',
      full: '',
    },
    icon: '',
    lastUpdated: 'Unknown',
    marketValue: 0,
    historicalValue: 0,
    minimumBuyout: 0,
    quantity: 0,
  };

  try {
    const parser = new HtmlParser.Parser({
      onattribute: (name, value) => {
        if (name === 'class' && value === 'cf-error-code') {
          error = isDownError;
        }
      },
      ontext: (text: string) => {
        if (error?.error) {
          return;
        }

        // Trim and remove newlines
        text = text.replace(/(\n)/g, '').trim();

        if (text.length === 0) {
          return;
        }

        // Try evaluate the code, looking for "window.__INITIAL_STATE__"
        if (text.includes('__INITIAL_STATE__')) {
          foundItemData = true;

          // DONT REMOVE!! Fake the window object
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const window = {};
          const stateStr = text.match(/(?<state>.+)(?:\(function)/)?.groups?.state;

          if (stateStr) {
            // Convert to valid JSON
            const str = stateStr
              .replace('window.__INITIAL_STATE__=', '')
              .replace(';', '');
            // Convert to JS object
            const state = JSON.parse(str);
            const item = state.items.item;

            data.name = {
              full: item.name,
              slug: item.uniqueName,
            };
            data.icon = item.icon;
            data.id = item.itemId;
            data.url = `https://nexushub.co/wow-classic/items/${item.server}/${item.uniqueName}`;

            if (item.stats.current) {
              data.lastUpdated = item.stats.lastUpdated;
              data.quantity = item.stats.current.quantity;
              data.quantity = data.quantity ? Number(data.quantity) : 0;

              data.historicalValue = item.stats.current.historicalValue;
              data.marketValue = item.stats.current.marketValue;
              data.minimumBuyout = item.stats.current.minBuyout;
            }
          } else {
            error = isDownError;
          }
        }
      },
    }, { decodeEntities: true });
    parser.write(html);
    parser.end();

    if (error.error) {
      return error;
    }

    return foundItemData ? data : notFoundError;
  } catch (err) {
    console.error(err);
  }
}
