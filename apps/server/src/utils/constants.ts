import { RegionName } from 'blizzapi';


interface RealmsKey {
  __key: 'realms';
  region: RegionName;
}

interface AuctionsKey {
  __key: 'auctions';
  region: RegionName;
  connectedRealmId: number;
}

type PreCacheKey<I> = Omit<I, '__key'>;

export type CacheKeys = RealmsKey | AuctionsKey;


export const CACHE_KEYS = {
  Realms: (key: PreCacheKey<RealmsKey>): string => {
    const k: RealmsKey = {
      __key: 'realms',
      ...key,
    };

    return JSON.stringify(k);
  },
  Auctions: (key: PreCacheKey<AuctionsKey>): string => {
    const k: AuctionsKey = {
      __key: 'auctions',
      ...key,
    };

    return JSON.stringify(k);
  },
};
