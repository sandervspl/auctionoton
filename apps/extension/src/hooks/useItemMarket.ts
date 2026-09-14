import type { ItemMarket } from '@/utils/itemCache';
import useStorageQuery from './useStorageQuery';
import { useRealm } from './useRealm';

export function useItemMarket(auctionHouseId: number): ItemMarket {
  const { data: user } = useStorageQuery('user');
  const { activeVersion } = useRealm();
  return { region: user?.region ?? 'eu', version: activeVersion, auctionHouseId };
}
