export type ItemData = {
  url: string;
  lastUpdated: string;
  marketValue: ValueObject;
  historicalValue: ValueObject;
  minimumBuyout: ValueObject;
}

export type CachedItemData = ItemData & {
  updatedAt: number;
}

export type ValueObject = {
  gold: number;
  silver: number;
  copper: number;
}

export type UserData = {
  region: 'eu' | 'us';
  faction: string;
  server: {
    name: string;
    slug: string;
  };
}

export type Storage = {
  user: UserData;
  items: {
    [serverSlug: string]: {
      [faction: string]: {
        [itemName: string]: CachedItemData;
      };
    };
  };
};

export type StorageKeys = keyof Storage;
