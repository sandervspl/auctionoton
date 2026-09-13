export const versions = ['seasonal', 'era', 'classic', 'hardcore'] as const;
export type Version = (typeof versions)[number];
export type Region = 'eu' | 'us';
export type AuctionJob = {
  region: Region;
  version: Version;
  auctionHouseId: number;
  day: string;
};
export type Price = {
  auctionHouseId: number;
  itemId: number;
  petSpeciesId: number | null;
  minBuyout: number;
  quantity: number;
  marketValue: number;
  historical: number;
  numAuctions: number;
};
export type Archive = {
  rawKey: string;
  fetchedAt: string;
  providerModifiedAt: string | null;
  bytes: number;
};
export type Manifest = Archive & { chunks: number; rows: number };
export type ProviderRealm = {
  realmId: number;
  name: string;
  localizedName: string;
  locale: string;
  auctionHouses: { auctionHouseId: number; type: string; lastModified: number }[];
};
export type ProviderRegion = {
  regionPrefix: Region;
  gameVersion: string;
  realms: ProviderRealm[];
};
export const providerVersions: Record<Version, string> = {
  seasonal: 'Season of Discovery',
  era: 'Classic Era',
  classic: 'Wrath',
  hardcore: 'Classic Era - Hardcore',
};
export function parseJob(value: unknown): AuctionJob {
  if (!value || typeof value !== 'object') throw new Error('Invalid import job');
  const job = value as AuctionJob;
  if (
    !['eu', 'us'].includes(job.region) ||
    !versions.includes(job.version) ||
    !Number.isSafeInteger(job.auctionHouseId) ||
    job.auctionHouseId <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(job.day) ||
    new Date(job.day).toISOString().slice(0, 10) !== job.day
  )
    throw new Error('Invalid import job');
  return {
    region: job.region,
    version: job.version,
    auctionHouseId: job.auctionHouseId,
    day: job.day,
  };
}
export const houseKey = (job: AuctionJob) => `${job.version}-${job.region}-${job.auctionHouseId}`;
export const snapshotId = (job: AuctionJob) => `${houseKey(job)}-${job.day}`;
export function validatePrice(value: unknown, auctionHouseId: number): Price {
  if (!value || typeof value !== 'object') throw new Error('Invalid auction row');
  const item = value as Price;
  if (item.auctionHouseId !== auctionHouseId) throw new Error('Auction house mismatch');
  for (const key of [
    'itemId',
    'minBuyout',
    'quantity',
    'marketValue',
    'historical',
    'numAuctions',
  ] as const) {
    if (!Number.isSafeInteger(item[key]) || item[key] < 0) {
      throw new Error(`Invalid or unsafe integer: ${key}`);
    }
  }
  if (
    item.itemId === 0 ||
    (item.petSpeciesId != null &&
      (!Number.isSafeInteger(item.petSpeciesId) || item.petSpeciesId < 0))
  ) {
    throw new Error('Invalid item identity');
  }
  return {
    auctionHouseId,
    itemId: item.itemId,
    petSpeciesId: item.petSpeciesId ?? null,
    minBuyout: item.minBuyout,
    quantity: item.quantity,
    marketValue: item.marketValue,
    historical: item.historical,
    numAuctions: item.numAuctions,
  };
}
