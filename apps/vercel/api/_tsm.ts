import { kv } from '@vercel/kv';

type Region = {
  regionId: number;
  name: 'Europe' | 'North America' | 'Taiwan' | 'Korea';
  regionPrefix: 'eu' | 'us' | 'tw' | 'kr';
  gmtOffset: number;
  gameVersion: 'Classic Era' | 'Classic Era - Hardcore' | 'Season of Discovery' | 'Wrath';
  lastModified: number;
};

type AuctionHouse = {
  auctionHouseId: number;
  type: 'Alliance' | 'Horde' | 'Neutral';
  lastModified: number;
};

type Realm = {
  realmId: number;
  name: string;
  localizedName: string;
  locale: string;
  auctionHouses: AuctionHouse[];
};

type Item = {
  auctionHouseId: number;
  itemId: number;
  petSpeciesId: number | null;
  minBuyout: number;
  quantity: number;
  marketValue: number;
  historical: number;
  numAuctions: number;
};

async function getAccessToken() {
  const KV_KEY = 'tsm:access-token';

  const cached = await kv.get<string>(KV_KEY);
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
  });

  if (response.status !== 200) {
    throw new Error('Failed to fetch access token');
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
    await kv.set(KV_KEY, access_token, { ex: 60 * 60 * 24 });
  } catch (error: any) {
    console.error('kv error:', error.message || 'unknown error');
  }

  return access_token;
}

const headers = async () => {
  const token = await getAccessToken();

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export async function getRegions() {
  const KV_KEY = 'tsm:regions';

  const cached = await kv.get<Region[]>(KV_KEY);
  if (cached) {
    return cached;
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
    await kv.set(KV_KEY, regions.items, { ex: 60 * 60 * 24 });
  } catch (error: any) {
    console.error('kv error:', error.message || 'unknown error');
  }

  return regions.items;
}

export async function getRealms(regionId: number) {
  const KV_KEY = `tsm:realms:${regionId}`;
  const cached = await kv.get<Realm[]>(KV_KEY);
  if (cached) {
    return cached;
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
    await kv.set(KV_KEY, realms.items, { ex: 60 * 60 * 24 });
  } catch (error: any) {
    console.error('kv error:', error.message || 'unknown error');
  }

  return realms.items;
}

export async function getAuctionHouse(auctionHouseId: number) {
  const KV_KEY = `tsm:ah:${auctionHouseId}`;
  const recentlyUpdated = await kv.get<string>(KV_KEY);

  if (recentlyUpdated) {
    return;
  }

  // Temporarily lock the key to prevent multiple requests
  await kv.set(KV_KEY, new Date().toISOString(), { ex: 5 });

  console.log(`fetching auction house "${auctionHouseId}"...`);

  // TSM needs to resolve in less than 20 seconds or else we cancel the request
  const response = await Promise.race<Error | Response>([
    new Promise((resolve) => setTimeout(() => resolve(new Error('timeout')), 20_000)),
    fetch(`https://pricing-api.tradeskillmaster.com/ah/${auctionHouseId}`, {
      headers: await headers(),
    }),
  ]);

  if (response instanceof Error) {
    throw new Error(`Failed to fetch auction house "${auctionHouseId}": ${response.message}`);
  }

  if (response.status !== 200) {
    throw new Error(`Failed to fetch auction house "${auctionHouseId}": ${response.statusText}`);
  }

  const auctionHouse = (await response.json()) as Item[];

  if (Array.isArray(auctionHouse) && auctionHouse.length > 0) {
    try {
      await kv.set(KV_KEY, new Date().toISOString(), { ex: 60 * 60 * 6 });
    } catch (error: any) {
      console.error('kv error:', error.message || 'unknown error');
    }
  }

  return auctionHouse;
}
