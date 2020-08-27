import * as i from 'types';
import { GetState, SetState } from 'zustand';

import asyncStorage from 'utils/asyncStorage';


export type State = Stores & {
  set: (fn: (state: i.State) => void) => void;
}

export type Stores = {
  storage: i.StorageState;
  ui: i.UiState;
}

export type ModularState = {
  set: (fn: (state: i.State) => void) => void;
  modules: {
    [key in keyof Stores]: (set: i.Set, get: i.Get) => Stores[key];
  };
}

export type ItemData = {
  url: string;
  lastUpdated: string;
  marketValue: ValueObject;
  historicalValue: ValueObject;
  minimumBuyout: ValueObject;
}

export type Cache = {
  updatedAt: number;
}

export type CachedItemData = ItemData & Cache;

export type ValueObject = {
  gold: number;
  silver: number;
  copper: number;
}

export type Regions = 'eu' | 'us';

export type Factions = 'Alliance' | 'Horde';

export type UserData = {
  region: Regions;
  faction: Factions;
  server: {
    name: string;
    slug: string;
  };
}

export type ItemsData = {
  [serverSlug: string]: {
    [faction: string]: {
      [itemName: string]: CachedItemData;
    };
  };
};

export type BrowserStorage = {
  user: UserData;
  items: ItemsData;
}

export type StorageState = BrowserStorage & {
  actions: {
    init: () => Promise<void>;
    save: typeof asyncStorage.set;
    getItem: (name: string) => Promise<i.CachedItemData | undefined>;
  };
};

export type StorageKeys = keyof Omit<StorageState, 'actions'>;

export type UiState = {
  keys: Record<string, boolean>;
  shownTip: Record<string, boolean>;
}

export type Set = SetState<State>;
export type Get = GetState<State>;
