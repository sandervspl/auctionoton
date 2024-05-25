import { createDbClient } from '../db';
import { items } from '../db/schema';
import { KEYS, kv } from '../kv';
import { Item, Realm, Region } from '../types/tsm';

async function getAccessToken() {
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
      token: process.env.TSM_API_KEY,
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
    console.error('kv error:', error.message || 'unknown error');
  }

  return access_token;
}

async function headers() {
  const token = await getAccessToken();

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getRegions() {
  const cached = await kv.get(KEYS.tsmRegions);
  if (cached) {
    return JSON.parse(cached) as Region[];
  }

  const response = await fetch('https://realm-api.tradeskillmaster.com/regions', {
    headers: await headers(),
  });
  if (response.status !== 200) {
    throw new Error('Failed to fetch regions');
  }

  const regions = (await response.json()) as {
    items: Region[];
  };

  try {
    await kv.set(KEYS.tsmRegions, JSON.stringify(regions.items), { EX: 60 * 60 * 24, NX: true });
  } catch (error: any) {
    console.error('kv error:', error.message || 'unknown error');
  }

  return regions.items;
}

export async function getRealms(regionId: number) {
  const KV_KEY = KEYS.tsmRealmsRegion(regionId);
  const cached = await kv.get(KV_KEY);
  if (cached) {
    return JSON.parse(cached) as Realm[];
  }

  const response = await fetch(
    `https://realm-api.tradeskillmaster.com/regions/${regionId}/realms`,
    {
      headers: await headers(),
    },
  );
  if (response.status !== 200) {
    throw new Error(`Failed to fetch realms for region "${regionId}"`);
  }

  const realms = (await response.json()) as {
    items: Realm[];
  };

  try {
    await kv.set(KV_KEY, JSON.stringify(realms.items), { EX: 60 * 60 * 24 });
  } catch (error: any) {
    console.error('kv error:', error.message || 'unknown error');
  }

  return realms.items;
}

const queue = new Map<string | number, Promise<Item[] | undefined>>();

async function fetchAuctionHouse(auctionHouseId: string | number) {
  console.log(`fetching auction house "${auctionHouseId}"...`);

  const response = await fetch(`https://pricing-api.tradeskillmaster.com/ah/${auctionHouseId}`, {
    headers: await headers(),
  });

  console.log(`fetched auction house "${auctionHouseId}": ${response.status}`);

  if (response.status !== 200) {
    try {
      await response.body?.cancel?.();
    } catch (err) {}
    throw new Error(`Failed to fetch auction house "${auctionHouseId}": ${response.statusText}`);
  }

  return response.json() as Promise<Item[]>;
}

export async function getAuctionHouse(auctionHouseId: string | number) {
  // If already in queue, return its request
  if (queue.has(auctionHouseId)) {
    console.log(`Waiting for AH "${auctionHouseId}" in queue to resolve...`);
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

        const auctionHouse = await fetchAuctionHouse(auctionHouseId);

        if (Array.isArray(auctionHouse) && auctionHouse.length > 0) {
          try {
            await kv.set(KV_KEY, new Date().toISOString(), { EX: 60 * 60 * 6, NX: true });
          } catch (error: any) {
            console.error('kv error:', error.message || 'unknown error');
          }
        }

        return auctionHouse;
      } catch (err: any) {
        console.error(`Error fetching AH "${auctionHouseId}"`, err.message);
        return undefined;
      } finally {
        // Remove from queue
        console.log(`Removing AH "${auctionHouseId}" from queue...`);
        queue.delete(auctionHouseId);
        await kv.set(KV_KEY, new Date().toISOString(), { EX: 60 * 60 * 6, NX: true });
      }
    })(),
  );

  return queue.get(auctionHouseId);
}

export async function getItem(itemId: number, auctionHouseId: number) {
  console.info('2. Fetching item from TSM');

  const response = await fetch(
    `https://pricing-api.tradeskillmaster.com/ah/${auctionHouseId}/item/${itemId}`,
    {
      headers: await headers(),
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
  console.info('2. done');

  console.log('2. Adding item to DB');
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
    console.log('2. closing db connection');
    client.end();
  }

  console.log('2. done');

  return item;
}
