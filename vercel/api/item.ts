import * as i from './_types';

export const config = {
  runtime: 'experimental-edge',
};

export default async function handler(req: Request, res: Response) {
  const query = new URLSearchParams(req.url!.split('?')[1]);
  const serverSlug = getServerSlug(query.get('server_name')!);
  const factionSlug = getFactionSlug(query.get('faction')!);

  console.info(`Fetching item '${query.get('id')}' for '${serverSlug}' (${factionSlug})`);

  const url = `https://api.nexushub.co/wow-classic/v1/items/${serverSlug}-${factionSlug}/${query.get('id')}`;
  const result = await (await fetch(url)).json() as i.NexusHub.ItemsResponse | i.NexusHub.ErrorResponse;

  if ('error' in result) {
    const code = result.error ? 500 : 404;
    return new Response(
      JSON.stringify({ error: 'true', message: result.error }),
      { status: code },
    );
  }

  const data = nexushubToItemResponse(result, Number(query.get('amount') || 1));
  return new Response(
    JSON.stringify(data),
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'cache-control': 'public, max-age=3600',
      },
    },
  );
}


/** UTILS */
function getServerSlug(name = '') {
  return decodeURI(name)
    .toLowerCase()
    .replace('\'', '')
    .replace(' ', '-');
}

function getFactionSlug(faction = '') {
  return faction.toLowerCase();
}

function convertToCoins(rawPrice: number = 0, amount = 1): i.PriceObject {
  const multiPrice = rawPrice * amount;
  const gold = Math.floor(multiPrice / 10000) || 0;
  const silver = Math.floor(multiPrice % 10000 / 100) || 0;
  const copper = multiPrice % 100 || 0;

  return {
    gold: String(gold),
    silver: String(silver),
    copper: String(copper),
    raw: String(rawPrice),
  };
}

function nexushubToItemResponse(data: i.NexusHub.ItemsResponse, amount = 1): i.ItemResponse {
  const transformedData: i.ItemResponse = {
    ...data,
    tooltip: undefined,
    tags: data.tags.join(','),
    uri: '/items/' + data.itemId,
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
        minimumBuyout: convertToCoins(data.stats.current?.minBuyout, amount),
        historicalValue: convertToCoins(data.stats.current?.historicalValue, amount),
        marketValue: convertToCoins(data.stats.current?.marketValue, amount),
      },
      lastUpdated: data.stats.lastUpdated,
    },
    amount: String(amount),
  };

  return transformedData;
}
