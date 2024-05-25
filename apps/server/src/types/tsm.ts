export type Region = {
  regionId: number;
  name: 'Europe' | 'North America' | 'Taiwan' | 'Korea';
  regionPrefix: 'eu' | 'us' | 'tw' | 'kr';
  gmtOffset: number;
  gameVersion: 'Classic Era' | 'Classic Era - Hardcore' | 'Season of Discovery' | 'Wrath';
  lastModified: number;
};

export type AuctionHouse = {
  auctionHouseId: number;
  type: 'Alliance' | 'Horde' | 'Neutral';
  lastModified: number;
};

export type Realm = {
  realmId: number;
  name: string;
  localizedName: string;
  locale: string;
  auctionHouses: AuctionHouse[];
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
