import * as i from 'types';

export type ItemDataClassicPrices = {
  marketValue: i.ValueObject;
  historicalValue: i.ValueObject;
  minBuyout: i.ValueObject;
};

export type Cache = {
  updatedAt: i.Date_ISO_8601;
};

export type ItemDataClassicResponse = i.ItemResponseV2;

export type AnyCachedItem = i.CachedItemDataClassic;
export type CachedItemDataClassic = ItemDataClassicResponse & i.Cache;
export type MaybeCachedItemDataClassic = CachedItemDataClassic | undefined;
export type MaybeAnyItem = i.MaybeCachedItemDataClassic;

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
  region?: i.Regions;
  faction: Record<ServerSlug, i.Factions>; // server tied with faction
  version: i.GameVersion | undefined;
  isActive?: {
    classic?: 'classic';
    era?: i.GameVersion;
  };
  /** @deprecated use "realms" */
  server?: Partial<
    Record<
      i.GameVersion,
      {
        name: string;
        slug: string;
      }
    >
  >;
  realms?: Partial<
    Record<
      i.GameVersion,
      {
        name: string;
        slug: string;
        auctionHouseId: number;
      }
    >
  >;
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
