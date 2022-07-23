export const config = {
  runtime: 'experimental-edge',
};

export default async function handler(req: Request, res: Response) {
  const query = new URLSearchParams(req.url!.split('?')[1]);
  const serverSlug = getServerSlug(query.get('server_name')!);
  const factionSlug = getFactionSlug(query.get('faction')!);

  console.info(`Fetching item '${query.get('id')}' for '${serverSlug}' (${factionSlug})`);

  const url = `https://api.nexushub.co/wow-classic/v1/items/${serverSlug}-${factionSlug}/${query.get('id')}`;
  const result = await (await fetch(url)).json() as NexusHub.ItemsResponse | NexusHub.ErrorResponse;

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

function convertToCoins(rawPrice: number = 0, amount = 1): PriceObject {
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

function nexushubToItemResponse(data: NexusHub.ItemsResponse, amount = 1): ItemResponse {
  const transformedData: ItemResponse = {
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
      // lastUpdated: data.stats.lastUpdated?.toISOString(),
      lastUpdated: '',
    },
    amount: String(amount),
  };

  return transformedData;
}


/** TYPES */
type Query = {
  id: string;
  server_name: string;
  faction: string;
  amount?: string;
};

namespace NexusHub {
  interface Tooltip {
    label: string;
    format: string;
  }

  interface Current {
    historicalValue: number;
    marketValue: number;
    minBuyout: number;
    numAuctions: number;
    quantity: number;
  }

  interface Previous {
    marketValue: number;
    minBuyout: number;
    quantity: number;
    historicalValue: number;
    numAuctions: number;
  }

  interface Stats {
    lastUpdated: Date;
    current: Current | null;
    previous: Previous | null;
  }

  export interface ItemsResponse {
    server: string;
    itemId: NumberString;
    name: string;
    uniqueName: string;
    icon: string;
    tags: string[];
    requiredLevel: NumberString;
    itemLevel: NumberString;
    sellPrice: NumberString;
    vendorPrice?: NumberString;
    tooltip: Tooltip[];
    itemLink: string;
    stats: Stats;
  }

  export interface ErrorResponse {
    error: string;
    reason: string;
  }
}

type Date_ISO_8601 = string;
type NumberString = string;

type PriceObject = string | {
  gold: NumberString;
  silver: NumberString;
  copper: NumberString;
  raw: NumberString;
};

type PriceSnapshot = {
  marketValue: PriceObject;
  historicalValue: PriceObject;
  minimumBuyout: PriceObject;
  numAuctions: NumberString;
  quantity: NumberString;
};

type ItemResponse = Omit<NexusHub.ItemsResponse, 'stats' | 'tags' | 'tooltip'> & {
  uri: string;
  amount: NumberString;
  stats: {
    lastUpdated: Date_ISO_8601;
    current: PriceSnapshot;
    previous: PriceSnapshot;
  };
  tags: string;
  tooltip: undefined;
};
