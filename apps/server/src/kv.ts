import { createClient } from 'redis';
import * as i from './types';

const client = await createClient({
  url: process.env.REDIS_URL,
})
  .on('error', (err) => console.log('Redis Client Error', err))
  .connect();

export const kv = client;

export const KEYS = {
  tsmAccessToken: 'tsm:access_token',
  tsmRegions: 'tsm:regions',
  tsmRealms: 'tsm:realms',
  tsmAHRecentlyFetched: (auctionHouseId: string | number) => `tsm:ah:${auctionHouseId}`,
};
