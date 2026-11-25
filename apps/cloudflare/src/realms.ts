import type { AuctionJob, Region, Version } from './contracts';
import catalogData from './realm-catalog.json';

// TSM retired its authenticated realm and pricing APIs. Prices now come from its public CSV
// files, which have no realm index, so realms are listed in realm-catalog.json. Update that
// file when Blizzard adds, merges or renames realms (see docs/realm-catalog.md).
export const publicDataOrigin = 'https://public-data.tradeskillmaster.com';

export type CatalogRealm = {
  name: string;
  localizedName: string;
  realmId: number;
  /** TSM's realm slug; a faction's CSV lives at `${path}/realm/${slug}-${faction}/items.csv`. */
  slug: string;
  auctionHouses: { auctionHouseId: number; type: string }[];
};
export type CatalogRegion = {
  /** TSM's `{gameType}/{regionSlug}` path segment, e.g. `classic/eu-hc`. */
  path: string;
  realms: CatalogRealm[];
};
export type RealmCatalog = Record<Version, Record<Region, CatalogRegion>>;

export const realmCatalog = catalogData as RealmCatalog;

export function catalogRegion(region: Region, version: Version, catalog = realmCatalog) {
  const entry = catalog[version]?.[region];
  if (!entry) throw new Error(`No realm catalog for ${region}/${version}`);
  return entry;
}

export function getRealms(region: Region, version: Version, catalog = realmCatalog) {
  return catalogRegion(region, version, catalog)
    .realms.map(({ name, localizedName, realmId, auctionHouses }) => ({
      name,
      localizedName: localizedName || name,
      realmId,
      auctionHouses: auctionHouses.map(({ auctionHouseId, type }) => ({ auctionHouseId, type })),
    }))
    .sort((a, b) => a.localizedName.localeCompare(b.localizedName));
}

/**
 * Connected realms share one auction house, so any member realm's CSV holds its prices.
 * Returns undefined when the catalog does not list the house for that region and version.
 */
export function auctionHouseCsvUrl(
  job: Pick<AuctionJob, 'region' | 'version' | 'auctionHouseId'>,
  catalog = realmCatalog,
) {
  const entry = catalog[job.version]?.[job.region];
  if (!entry) return undefined;
  for (const realm of entry.realms) {
    const house = realm.auctionHouses.find(
      (candidate) => candidate.auctionHouseId === job.auctionHouseId,
    );
    if (house)
      return `${publicDataOrigin}/${entry.path}/realm/${realm.slug}-${house.type.toLowerCase()}/items.csv`;
  }
  return undefined;
}

export function validateRealmCatalog(value: unknown): RealmCatalog {
  const catalog = value as RealmCatalog;
  if (!catalog || typeof catalog !== 'object') throw new Error('Invalid realm catalog');
  for (const [version, regions] of Object.entries(catalog)) {
    for (const [region, entry] of Object.entries(regions)) {
      if (!/^[a-z-]+\/[a-z-]+$/.test(entry.path) || !Array.isArray(entry.realms))
        throw new Error(`Invalid realm catalog entry ${version}/${region}`);
      const houses = new Map<number, string>();
      for (const realm of entry.realms) {
        if (
          !realm.name ||
          !Number.isSafeInteger(realm.realmId) ||
          realm.realmId <= 0 ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(realm.slug) ||
          !realm.auctionHouses.length
        )
          throw new Error(`Invalid realm ${version}/${region}/${realm.name}`);
        for (const house of realm.auctionHouses) {
          if (
            !Number.isSafeInteger(house.auctionHouseId) ||
            house.auctionHouseId <= 0 ||
            !['Alliance', 'Horde'].includes(house.type)
          )
            throw new Error(`Invalid auction house ${version}/${region}/${realm.name}`);
          // Connected realms may share a house, but one house cannot change faction.
          const type = houses.get(house.auctionHouseId);
          if (type && type !== house.type)
            throw new Error(`Conflicting auction house ${house.auctionHouseId}`);
          houses.set(house.auctionHouseId, house.type);
        }
      }
    }
  }
  return catalog;
}
