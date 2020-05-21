export type ItemData = {
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
  faction: string;
  server: {
    name: string;
    slug: string;
  };
}
