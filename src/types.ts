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

export type Storage = {
  user: UserData;
  items: ItemsData;
};

export type StorageKeys = keyof Storage;

export type Realm = string | { english: string; russian: string }

export type Realms = {
  eu: {
    english: Realm[];
    russian: Realm[];
  };
  us: string[];
}

export type PageItem = {
  name: string;
  id: string;
}
