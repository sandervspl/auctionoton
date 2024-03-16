import { kv } from '../kv';

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

type RateLimits = 10 | 100 | 500;

const getTSMRateLimitKey = (limit: RateLimits) => `tsm:rate-limit-24hr:${limit}`;

// Get the current rate limit left for the TSM API
export async function getTSMRateLimit24hr(limit: RateLimits) {
  const key = getTSMRateLimitKey(limit);

  const cached = await kv.get(key);
  if (cached) {
    return Number(cached);
  }

  await kv.set(key, limit, { EX: 60 * 60 * 24 });
  return limit;
}

// Count down the rate limit for the TSM API
export async function useTSMRateLimit24hr(limit: RateLimits) {
  const amount = await getTSMRateLimit24hr(limit);

  if (amount === 0) {
    console.log(`TSM rate limit reached! ${amount}/${limit}`);
    return amount;
  }

  const key = getTSMRateLimitKey(limit);
  const nextAmount = amount - 1;
  await kv.set(key, nextAmount);
  console.log(`TSM rate limit left: ${nextAmount}/${limit}`);

  return nextAmount;
}

async function getAccessToken() {
  const KV_KEY = 'tsm:access-token';

  const cached = await kv.get(KV_KEY);
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
    await kv.set(KV_KEY, access_token, { EX: 60 * 60 * 24 });
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

  const cached = await kv.get(KV_KEY);
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
    await useTSMRateLimit24hr(10);
    await kv.set(KV_KEY, JSON.stringify(regions.items), { EX: 60 * 60 * 24 });
  } catch (error: any) {
    console.error('kv error:', error.message || 'unknown error');
  }

  return regions.items;
}

export async function getRealms(regionId: number) {
  const KV_KEY = `tsm:realms:${regionId}`;
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
    await useTSMRateLimit24hr(10);
    await kv.set(KV_KEY, JSON.stringify(realms.items), { EX: 60 * 60 * 24 });
  } catch (error: any) {
    console.error('kv error:', error.message || 'unknown error');
  }

  return realms.items;
}

export async function getAuctionHouse(auctionHouseId: number) {
  const KV_KEY = `tsm:ah:${auctionHouseId}`;
  const recentlyUpdated = await kv.get(KV_KEY);

  if (recentlyUpdated) {
    return;
  }

  // Temporarily lock the key to prevent multiple requests
  await kv.set(KV_KEY, new Date().toISOString(), { EX: 5 });

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

  const auctionHouse = (await response.json()) as Item[];

  if (Array.isArray(auctionHouse) && auctionHouse.length > 0) {
    try {
      await useTSMRateLimit24hr(100);
      await kv.set(KV_KEY, new Date().toISOString(), { EX: 60 * 60 * 6 });
    } catch (error: any) {
      console.error('kv error:', error.message || 'unknown error');
    }
  }

  return auctionHouse;
}

export async function getItem(itemId: number, auctionHouseId: number) {
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

  await useTSMRateLimit24hr(500);

  return item;
}
