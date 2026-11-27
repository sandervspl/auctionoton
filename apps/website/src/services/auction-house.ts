import { type Faction, findRealm, findRealmByAuctionHouse } from 'services/realms';

export function getAuctionHouseId(region: string, realmSlug: string, faction: string) {
  return findRealm(realmSlug, region)?.auctionHouses[faction as Faction];
}

/** Realm used until the visitor picks one: the realm production imports prices for. */
export const DEFAULT_REALM = {
  realm: 'forever-normal',
  region: 'eu',
  faction: 'alliance',
} as const;

export function getDefaultAuctionHouseId() {
  return getAuctionHouseId(DEFAULT_REALM.region, DEFAULT_REALM.realm, DEFAULT_REALM.faction);
}

export function getAuctionHouseRegion(id: number) {
  return findRealmByAuctionHouse(id)?.region;
}
