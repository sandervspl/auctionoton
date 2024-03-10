import { getAuctionHouseIds, seasonalRealmsEU, seasonalRealmsUS } from 'services/realms';

export function getAuctionHouseId(region: string, realmSlug: string, faction: string) {
  const houses = {
    eu: getAuctionHouseIds(seasonalRealmsEU),
    us: getAuctionHouseIds(seasonalRealmsUS),
  };

  return houses[region!]?.[realmSlug!]?.[faction!];
}
