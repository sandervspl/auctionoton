import * as i from '../types';
import { createDbClient } from '../db';
import { items } from '../db/schema';
import { KEYS, kv } from '../kv';
import { Region, Item } from '../types/tsm';

const versionMap: Record<i.GameVersion, string> = {
  era: 'Classic Era',
  hardcore: 'Classic Era - Hardcore',
  classic: 'Wrath',
  seasonal: 'Season of Discovery',
} as const;

export const tsmApiKeys: Record<i.GameVersion, string> = {
  era: process.env.TSM_API_KEY_D!,
  hardcore: process.env.TSM_API_KEY_C!,
  classic: process.env.TSM_API_KEY_B!,
  seasonal: process.env.TSM_API_KEY!,
};

async function getAccessToken(tsmApiKey: string) {
  const cached = await kv.get(KEYS.tsmAccessToken);
  if (cached) {
    return cached;
  }

  const response = await fetch('https://auth.tradeskillmaster.com/oauth2/token', {
    method: 'POST',
    body: JSON.stringify({
      client_id: process.env.TSM_CLIENT_ID,
      grant_type: 'api_token',
      scope: 'app:realm-api app:pricing-api',
      token: tsmApiKey ?? process.env.TSM_API_KEY,
    }),
    headers: {
      'content-type': 'application/json',
    },
  });

  if (!response.ok) {
    try {
      await response.body?.cancel?.();
    } catch (err) {}

    throw new Error(
      `Failed to fetch TSM access token: (${response.status}) ${response.statusText}`,
    );
  }

  const { access_token } = (await response.json()) as {
    access_token: string;
    expires_at: number;
    refresh_expires_in: number;
    refresh_token: string;
    token_type: 'Bearer';
    'not-before-policy': number;
    session_state: string;
    scope: 'profile email';
  };

  try {
    await kv.set(KEYS.tsmAccessToken, access_token, { EX: 60 * 60 * 24, NX: true });
  } catch (error: any) {
    console.error('[getAccessToken]', 'kv error:', error.message || 'unknown error');
  }

  return access_token;
}

async function headers(tsmApiKey: string) {
  const token = await getAccessToken(tsmApiKey);

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getRealms(regionq: i.Region, version: i.GameVersion) {
  const KV_KEY = KEYS.tsmRealms;
  const cached = await kv.get(KV_KEY);
  let regions: { items: Region[] } = cached ? JSON.parse(cached) : { items: [] };

  // Fetch from TSM if not in cache
  if (regions.items.length === 0) {
    const tsmApiKey = tsmApiKeys[version];
    const response = await fetch(`https://realm-api.tradeskillmaster.com/realms`, {
      headers: await headers(tsmApiKey),
    });
    if (response.status !== 200) {
      throw new Error(`Failed to fetch realms`);
    }

    regions = await response.json();

    // Cache the response
    if (regions.items && regions.items.length > 0) {
      try {
        await kv.set(KV_KEY, JSON.stringify(regions), { EX: 60 * 60 * 24 * 3 });
      } catch (error: any) {
        console.error('[getRealms]', 'kv error:', error.message || 'unknown error');
      }
    }
  }

  const region = regions.items.find(
    (region) => region.regionPrefix === regionq && region.gameVersion === versionMap[version],
  );

  if (region == null) {
    return [];
  }

  return region.realms;
}

const queue = new Map<string | number, Promise<Item[] | undefined>>();

async function fetchAuctionHouse(auctionHouseId: string | number, tsmApiKey: string) {
  console.info(auctionHouseId, 'fetching auction house...');

  const response = await fetch(`https://pricing-api.tradeskillmaster.com/ah/${auctionHouseId}`, {
    headers: await headers(tsmApiKey),
  });

  if (response.status !== 200) {
    try {
      await response.body?.cancel?.();
    } catch (err) {}
    throw new Error(`Failed to fetch auction house "${auctionHouseId}": ${response.statusText}`);
  }

  return response.json() as Promise<Item[]>;
}

export async function getAuctionHouse(auctionHouseId: string | number, tsmApiKey: string) {
  // If already in queue, return its request
  if (queue.has(auctionHouseId)) {
    console.info(auctionHouseId, 'Waiting for AH in queue to resolve...');
    return queue.get(auctionHouseId);
  }

  // Add auction house request to queue
  queue.set(
    auctionHouseId,
    (async () => {
      const KV_KEY = KEYS.tsmAHRecentlyFetched(auctionHouseId);

      try {
        const recentlyUpdated = await kv.get(KV_KEY);

        if (recentlyUpdated) {
          return undefined;
        }

        const auctionHouse = await fetchAuctionHouse(auctionHouseId, tsmApiKey);

        if (Array.isArray(auctionHouse) && auctionHouse.length > 0) {
          try {
            await kv.set(KV_KEY, new Date().toISOString(), { EX: 60 * 60 * 6, NX: true });
          } catch (error: any) {
            console.error(auctionHouseId, 'kv error:', error.message || 'unknown error');
          }
        }

        return auctionHouse;
      } catch (err: any) {
        console.error(auctionHouseId, 'Error fetching AH', err.message);
        return undefined;
      } finally {
        // Remove from queue
        queue.delete(auctionHouseId);
        await kv.set(KV_KEY, new Date().toISOString(), { EX: 60 * 60 * 6, NX: true });
      }
    })(),
  );

  return queue.get(auctionHouseId);
}

export async function getItem(itemId: number, auctionHouseId: number, tsmApiKey: string) {
  const logPrefix = `${itemId}:${auctionHouseId}`;
  console.info(logPrefix, 'Fetching item from TSM');

  const response = await fetch(
    `https://pricing-api.tradeskillmaster.com/ah/${auctionHouseId}/item/${itemId}`,
    {
      headers: await headers(tsmApiKey),
    },
  );

  if (response.status !== 200) {
    try {
      await response.body?.cancel?.();
    } catch (err) {}
    console.error(`Failed to fetch item "${itemId}": ${response.status} ${response.statusText}`);
    return null;
  }

  const item = (await response.json()) as Item;

  console.info(logPrefix, 'Adding item to DB');
  const { db, client } = createDbClient();

  try {
    await db
      .insert(items)
      .values({
        auctionHouseId: Number(auctionHouseId),
        itemId: item.itemId,
        numAuctions: item.numAuctions,
        marketValue: item.marketValue,
        historical: item.historical,
        minBuyout: item.minBuyout,
        quantity: item.quantity,
      })
      .onConflictDoNothing();
  } catch (err: any) {
    console.error(err.message);
  } finally {
    console.info(logPrefix, 'closing db connection');
    client.end();
  }

  return item;
}
