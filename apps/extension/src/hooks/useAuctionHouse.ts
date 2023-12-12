import useStorageQuery from './useStorageQuery';

export function useAuctionHouse() {
  const { data: user } = useStorageQuery('user');
  const auctionHouseId = user?.version ? user.realms?.[user.version]?.auctionHouseId : undefined;

  return auctionHouseId;
}
