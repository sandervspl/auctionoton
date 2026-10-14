import { useRealm } from './useRealm';

export function useAuctionHouse() {
  const { activeRealm } = useRealm();
  return activeRealm?.auctionHouseId;
}
