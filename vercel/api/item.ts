import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'experimental-edge',
};

export default async (req: VercelRequest, res: VercelResponse) => {
  const query = new URLSearchParams(req.url!.split('?')[1]);
  const serverSlug = getServerSlug(query.get('server_name')!);
  const factionSlug = getFactionSlug(query.get('faction')!);

  console.info(`Fetching item '${query.get('id')}' for '${serverSlug}' (${factionSlug})`);

  const url = `https://api.nexushub.co/wow-classic/v1/items/${serverSlug}-${factionSlug}/${query.get('id')}`;
  const result = await (await fetch(url)).json() as NexusHub.ItemsResponse | NexusHub.ErrorResponse;

  if ('error' in result) {
    const code = result.error ? 500 : 404;
    return res.status(code).json({ error: true, message: result.error });
  }

  const data = nexushubToItemResponse(result, Number(query.get('amount') || 1));

  return res.status(200).json(data);
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
    gold,
    silver,
    copper,
    raw: rawPrice,
  };
}

function nexushubToItemResponse(data: NexusHub.ItemsResponse, amount = 1) {
  const datav2 = {
    uri: '/items/' + data.itemId,
    stats: {
      current: {
        numAuctions: data.stats.current?.numAuctions ?? 0,
        quantity: data.stats.current?.quantity ?? 0,
        minimumBuyout: convertToCoins(data.stats.current?.minBuyout, amount),
        historicalValue: convertToCoins(data.stats.current?.historicalValue, amount),
        marketValue: convertToCoins(data.stats.current?.marketValue, amount),
      },
      previous: {
        numAuctions: data.stats.previous?.numAuctions ?? 0,
        quantity: data.stats.previous?.quantity ?? 0,
        minimumBuyout: convertToCoins(data.stats.current?.minBuyout, amount),
        historicalValue: convertToCoins(data.stats.current?.historicalValue, amount),
        marketValue: convertToCoins(data.stats.current?.marketValue, amount),
      },
      amount,
    }
  };

  return datav2;
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
      itemId: number;
      name: string;
      uniqueName: string;
      icon: string;
      tags: string[];
      requiredLevel: number;
      itemLevel: number;
      sellPrice: number;
      vendorPrice: number | null;
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

type PriceObject = string | {
  gold: number;
  silver: number;
  copper: number;
  raw: number;
};

type PriceSnapshotV2 = {
  marketValue: PriceObject;
  historicalValue: PriceObject;
  minimumBuyout: PriceObject;
  numAuctions: number;
  quantity: number;
};

type ItemResponseV2 = Omit<NexusHub.ItemsResponse, 'stats'> & {
  uri: string;
  amount: number;
  stats: {
      lastUpdated: Date_ISO_8601;
      current: PriceSnapshotV2;
      previous: PriceSnapshotV2;
  };
};
