import * as i from 'types';


export type ItemDataClassicPrices = {
  marketValue: i.ValueObject;
  historicalValue: i.ValueObject;
  minimumBuyout: i.ValueObject;
  raw: number;
}

export type Cache<V = i.Versions> = {
  __version: V;
  updatedAt: i.Date_ISO_8601;
}

export type ItemDataRetailPrices = {
  buyoutPrice: i.ValueObject;
  unitPrice: i.ValueObject;
}

export type ItemDataRetail = i.ItemDataRetailPrices & {
  lastUpdated: string;
  quantity: number;
}

export type ItemDataClassicResponse = Pick<i.ItemResponseV2, | 'amount' | 'uniqueName' | 'stats'>;

export type AnyCachedItem = i.CachedItemDataClassic | i.CachedItemDataRetail;
export type CachedItemDataClassic = ItemDataClassicResponse & i.Cache<'classic'>;
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

type ServerSlug = string;
export interface UserData {
  version: i.Versions;
  region: i.Regions;
  faction: Record<ServerSlug, i.Factions>; // server tied with faction
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

export type UiData = {
  keys: Record<string, boolean>;
  showTip: {
    shiftKey: boolean;
  };
}

// Everything can be nullable -- protect the extension from crashing at all cost
export type BrowserStorage = {
  user: Partial<i.UserData>;
  items: i.ItemsData;
  ui: UiData;
};

export type StorageKeys = keyof BrowserStorage;
