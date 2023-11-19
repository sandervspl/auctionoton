import * as i from 'types';

export type ItemDataClassicPrices = {
  marketValue: i.ValueObject;
  historicalValue: i.ValueObject;
  minimumBuyout: i.ValueObject;
};

export type Cache<V = i.Versions> = {
  __version: V;
  updatedAt: i.Date_ISO_8601;
};

export type ItemDataRetailPrices = {
  buyoutPrice: i.ValueObject;
  unitPrice: i.ValueObject;
};

export type ItemDataRetail = i.ItemDataRetailPrices & {
  lastUpdated: string;
  quantity: number;
};

export type ItemDataClassicResponse = i.ItemResponseV2;

// export type AnyCachedItem = i.CachedItemDataClassic | i.CachedItemDataRetail;
export type AnyCachedItem = i.CachedItemDataClassic;
export type CachedItemDataClassic = ItemDataClassicResponse & i.Cache<'classic'>;
export type MaybeCachedItemDataClassic = CachedItemDataClassic | undefined;
export type CachedItemDataRetail = i.ItemDataRetail & i.Cache<'retail'>;
export type MaybeCachedItemDataRetail = i.CachedItemDataRetail | undefined;
export type MaybeAnyItem = i.MaybeCachedItemDataClassic | i.MaybeCachedItemDataRetail;

export type ItemError = {
  error: boolean;
  reason: string;
};

export type ValueObject = {
  gold: number;
  silver: number;
  copper: number;
};

type ServerSlug = string;
export type UserData = {
  version?: i.Versions;
  region?: i.Regions;
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
    };
  };
};

export type ItemsData = {
  [ItemQueryKeyString: string]: i.AnyCachedItem;
};

export type UiData = {
  showTip: {
    shiftKey: boolean;
  };
};

// Everything can be nullable -- protect the extension from crashing at all cost
export type BrowserStorage = {
  user: i.UserData;
  items: i.ItemsData;
  ui: UiData;
};

export type StorageKeys = keyof BrowserStorage;
