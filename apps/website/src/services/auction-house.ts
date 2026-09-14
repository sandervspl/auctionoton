import { getAuctionHouseIds, seasonalRealmsEU, seasonalRealmsUS } from 'services/realms';

export function getAuctionHouseId(region: string, realmSlug: string, faction: string) {
  const houses = {
    eu: getAuctionHouseIds(seasonalRealmsEU),
    us: getAuctionHouseIds(seasonalRealmsUS),
  };

  return houses[region!]?.[realmSlug!]?.[faction!];
}

export function getAuctionHouseRegion(id: number) {
  if (
    seasonalRealmsEU.some((realm) =>
      realm.auctionHouses.some((house) => house.auctionHouseId === id),
    )
  )
    return 'eu';
  if (
    seasonalRealmsUS.some((realm) =>
      realm.auctionHouses.some((house) => house.auctionHouseId === id),
    )
  )
    return 'us';
  return undefined;
}
