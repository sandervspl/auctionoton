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

export type ItemData = {
  url: string;
  lastUpdated: string;
  marketValue: i.ValueObject;
  historicalValue: i.ValueObject;
  minimumBuyout: i.ValueObject;
  quantity: number;
}

export type Cache = {
  updatedAt: number;
}

export type CachedItemData = i.ItemData & i.Cache;

export type ValueObject = {
  gold: number;
  silver: number;
  copper: number;
}

export type Regions = 'eu' | 'us';

export type Factions = 'Alliance' | 'Horde';

export type UserData = {
  region: i.Regions;
  faction: i.Factions;
  server: {
    name: string;
    slug: string;
  };
}

export type ItemsData = {
  [serverSlug: string]: {
    [faction: string]: {
      [itemName: string]: i.CachedItemData;
    };
  };
};

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
