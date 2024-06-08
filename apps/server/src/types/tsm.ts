export type GameVersion =
  | 'Classic Era'
  | 'Classic Era - Hardcore'
  | 'Season of Discovery'
  | 'Wrath';

export type RegionName = 'Europe' | 'North America' | 'Taiwan' | 'Korea';

export type AuctionHouse = {
  auctionHouseId: number;
  type: 'Alliance' | 'Horde' | 'Neutral';
  lastModified: number;
};

export type Realm = {
  realmId: number;
  regionId: number;
  name: string;
  localizedName: string;
  locale: string;
  auctionHouses: AuctionHouse[];
};

export type Region = {
  regionId: number;
  name: RegionName;
  regionPrefix: 'eu' | 'us';
  gmtOffset: number;
  gameVersion: GameVersion;
  lastModified: string;
  realms: Realm[];
};

export type Item = {
  auctionHouseId: number;
  itemId: number;
  petSpeciesId: number | null;
  minBuyout: number;
  quantity: number;
  marketValue: number;
  historical: number;
  numAuctions: number;
};
