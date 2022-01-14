import * as i from 'types';
import { GetState, SetState } from 'zustand';

export * from './stores/storage/types';
export * from './stores/ui/types';


export type Store = Stores & {
  set: i.Set;
}

export type Stores = {
  storage: i.StorageStore;
  ui: i.UiStore;
}

export type GenStore = {
  [key in keyof Stores]: (set: i.Set, get: i.Get) => Stores[key];
} & {
  set?: (fn: (state: i.Store) => void) => void;
}

export type ItemDataClassicPrices = {
  marketValue: i.ValueObject;
  historicalValue: i.ValueObject;
  minimumBuyout: i.ValueObject;
  raw: number;
}

export type ItemDataClassic = Omit<i.NH.ItemsResponse, 'stats'> & {
  uri: string;
  amount: number;
  stats: {
    current: {
      marketValue: i.ItemDataClassicPrices;
      historicalValue: i.ItemDataClassicPrices;
      minimumBuyout: i.ItemDataClassicPrices;
    };
    previous: {
      marketValue: i.ItemDataClassicPrices;
      historicalValue: i.ItemDataClassicPrices;
      minimumBuyout: i.ItemDataClassicPrices;
    };
  };
}

export type Cache<V = i.Versions> = {
  __version: V;
  updatedAt: number;
}

export type ItemDataRetailPrices = {
  buyoutPrice: i.ValueObject;
  unitPrice: i.ValueObject;
}

export type ItemDataRetail = i.ItemDataRetailPrices & {
  lastUpdated: string;
  quantity: number;
}

export type AnyCachedItem = i.CachedItemDataClassic | i.CachedItemDataRetail;
export type CachedItemDataClassic = i.ItemDataClassic & i.Cache<'classic'>;
export type MaybeCachedItemDataClassic = CachedItemDataClassic | undefined;
export type CachedItemDataRetail = i.ItemDataRetail & i.Cache<'retail'>;
export type MaybeCachedItemDataRetail = i.CachedItemDataRetail | undefined;
export type MaybeAnyItem = i.MaybeCachedItemDataClassic | i.MaybeCachedItemDataRetail;

export type ItemError = {
  error: boolean;
  reason: string;
}

export type ValueObject = {
  gold: number;
  silver: number;
  copper: number;
}

export type Versions = 'classic' | 'retail';

export type Regions = 'eu' | 'us';

export type Factions = 'Alliance' | 'Horde';

export interface UserData {
  version: i.Versions;
  region: i.Regions;
  faction: Record<string, i.Factions>; // server tied with faction
  server: {
    classic?: {
      name: string;
      slug: string;
    };
    retail?: {
      name: string;
      realmId: number;
      connectedRealmId: number;
    }
  };
}

export type ItemsData = {
  [ItemQueryKeyString: string]: i.AnyCachedItem;
}

export type BrowserStorage = {
  user: i.UserData;
  items: i.ItemsData;
  showTip: {
    shiftKey: boolean;
  };
}

export type StorageKeys = keyof BrowserStorage;

export type ZustandSet = SetState<i.Store>;
// This is the Zustand set function augmented with Immer's produce
export type Set = ((fn: (state: i.Store) => void) => void);
export type Get = GetState<i.Store>;
