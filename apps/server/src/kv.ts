import { createClient } from 'redis';

export const kv = await createClient({
  url: process.env.REDIS_URL,
})
  .on('error', (err) => console.log('Redis Client Error:', err.message))
  .connect();

export const KEYS = {
  tsmAccessToken: 'tsm:access_token',
  tsmRegions: 'tsm:regions',
  tsmRealms: 'tsm:realms',
  tsmAHRecentlyFetched: (auctionHouseId: string | number) => `tsm:ah:${auctionHouseId}`,
};
