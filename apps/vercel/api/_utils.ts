import * as i from './_types.js';

export const supportedClassicEraServers = ['stitches', 'nek-rosh'];

export function getQueries(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

export function getURLParam(req: Request): string {
  const pathname = req.url.startsWith('/') ? req.url : new URL(req.url).pathname;

  return pathname.replace(/\/+$/, '').split('/').slice(-1)[0];
}

export function getServerSlug(name = '') {
  return decodeURI(name).toLowerCase().replace("'", '').replace(' ', '-');
}

export function getFactionSlug(faction = '') {
  return faction.toLowerCase();
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function convertToCoins(rawPrice: number = 0, amount = 1): i.PriceObject {
  const multiPrice = rawPrice * amount;
  const gold = Math.floor(multiPrice / 10000) || 0;
  const silver = Math.floor((multiPrice % 10000) / 100) || 0;
  const copper = multiPrice % 100 || 0;

  return {
    gold: String(gold),
    silver: String(silver),
    copper: String(copper),
    raw: String(rawPrice),
  };
}

export function nexushubToItemResponse(data: i.NexusHub.ItemsResponse, amount = 1): i.ItemResponse {
  const transformedData: i.ItemResponse = {
    ...data,
    tooltip: undefined,
    tags: Array.isArray(data.tags) ? data.tags.join(',') : data.tags,
    stats: {
      current: {
        numAuctions: String(data.stats.current?.numAuctions ?? 0),
        quantity: String(data.stats.current?.quantity ?? 0),
        minimumBuyout: convertToCoins(data.stats.current?.minBuyout, amount),
        historicalValue: convertToCoins(data.stats.current?.historicalValue, amount),
        marketValue: convertToCoins(data.stats.current?.marketValue, amount),
      },
      previous: {
        numAuctions: String(data.stats.previous?.numAuctions ?? 0),
        quantity: String(data.stats.previous?.quantity ?? 0),
        minimumBuyout: convertToCoins(data.stats.previous?.minBuyout, amount),
        historicalValue: convertToCoins(data.stats.previous?.historicalValue, amount),
        marketValue: convertToCoins(data.stats.previous?.marketValue, amount),
      },
      lastUpdated: data.stats.lastUpdated,
    },
    amount: String(amount),
  };

  return transformedData;
}

export function isAuth(req: Request) {
  const query = getQueries(req.url);

  if (query.get('secret') !== process.env.AUC_SECRET) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'content-type': 'text/plain',
        'cache-control': 'no-store',
      },
    });
  }

  return true;
}
