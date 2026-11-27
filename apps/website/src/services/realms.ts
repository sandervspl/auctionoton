import type { Region, Version } from '../../../cloudflare/src/contracts';
import { realmCatalog } from '../../../cloudflare/src/realms';

export type Faction = 'alliance' | 'horde';

export type RealmOption = {
  /** URL slug: the catalog slug prefixed with its version, e.g. `forever-normal`. */
  slug: string;
  region: Region;
  version: Version;
  name: string;
  auctionHouses: Partial<Record<Faction, number>>;
};

/** Picker order: the versions with live data first. */
const versionOrder: Version[] = [
  'forever',
  'anniversary',
  'seasonal',
  'hardcore',
  'classic',
  'era',
];

export const versionLabels: Record<Version, string> = {
  forever: 'Forever',
  anniversary: 'Anniversary',
  seasonal: 'Season of Discovery',
  hardcore: 'Hardcore',
  classic: 'Classic Progression',
  era: 'Era',
};

const regions: Region[] = ['eu', 'us'];

export const realmGroups = versionOrder.flatMap((version) =>
  regions.flatMap((region) => {
    const entry = realmCatalog[version]?.[region];
    if (!entry?.realms.length) return [];
    const realms: RealmOption[] = entry.realms
      .map((realm) => ({
        slug: `${version}-${realm.slug}`,
        region,
        version,
        name: realm.localizedName || realm.name,
        auctionHouses: Object.fromEntries(
          realm.auctionHouses.map((house) => [house.type.toLowerCase(), house.auctionHouseId]),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [{ heading: `${versionLabels[version]} (${region.toUpperCase()})`, realms }];
  }),
);

const allRealms = realmGroups.flatMap((group) => group.realms);

/**
 * Finds a realm by URL slug. Slugs without a version prefix come from links made before the
 * catalog existed, when the site listed only Season of Discovery realms.
 */
export function findRealm(slug: string, region: string) {
  return (
    allRealms.find((realm) => realm.slug === slug && realm.region === region) ??
    allRealms.find((realm) => realm.slug === `seasonal-${slug}` && realm.region === region)
  );
}

export function findRealmByAuctionHouse(auctionHouseId: number) {
  return allRealms.find((realm) => Object.values(realm.auctionHouses).includes(auctionHouseId));
}

/** E.g. `Normal · Forever (EU)`; unknown slugs fall back to a readable version of the slug. */
export function realmLabel(slug: string, region: string) {
  const realm = findRealm(slug, region);
  if (!realm) return `${slug.replaceAll('-', ' ')} (${region.toUpperCase()})`;
  return `${realm.name} · ${versionLabels[realm.version]} (${region.toUpperCase()})`;
}
