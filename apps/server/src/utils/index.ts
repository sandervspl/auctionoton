import { Ratelimit } from '@upstash/ratelimit';
import crypto from 'node:crypto';

import * as i from '../types';

export const successHeaders = {
  'content-type': 'application/json',
  'cache-control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate',
  'Access-Control-Allow-Origin': '*',
};

export const errorHeaders = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
  'Access-Control-Allow-Origin': '*',
};

export function getFingerprint(req: Request) {
  const cleaned = {} as Record<keyof Request, any>;
  const prefix = 'acl:';

  const keys = Object.keys(req).sort() as Array<keyof Request>;

  keys.forEach((k) => {
    const _k = k.toLowerCase() as keyof Request;
    cleaned[_k] = req[_k];
  });

  if (cleaned.method) {
    cleaned.method = cleaned.method.toUpperCase();
  }

  if ('ttl' in cleaned) {
    delete cleaned.ttl;
  }

  const hash = crypto.createHash('md5').update(JSON.stringify(cleaned)).digest('hex');

  return prefix + hash;
}

export async function checkRateLimit(rateLimit: Ratelimit, request: Request) {
  const fingerprint = getFingerprint(request);
  const { success, remaining, reset, limit, pending } = await rateLimit.limit(fingerprint);

  if (!success) {
    throw { remaining, reset, limit, pending };
  }

  return true;
}

export const versionMap = {
  era: 'Classic Era',
  hardcore: 'Classic Era - Hardcore',
  classic: 'Wrath',
  seasonal: 'Season of Discovery',
};

export function getQueries(url: string): URLSearchParams {
  const fixedUrl = !url.startsWith('http') ? `https://localhost:3000${url}` : url;
  return new URL(fixedUrl).searchParams;
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
        minBuyout: convertToCoins(data.stats.current?.minBuyout, amount),
        historicalValue: convertToCoins(data.stats.current?.historicalValue, amount),
        marketValue: convertToCoins(data.stats.current?.marketValue, amount),
      },
      previous: {
        numAuctions: String(data.stats.previous?.numAuctions ?? 0),
        quantity: String(data.stats.previous?.quantity ?? 0),
        minBuyout: convertToCoins(data.stats.previous?.minBuyout, amount),
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

export const qualityMap = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
  ARTIFACT: 6,
} as const;
