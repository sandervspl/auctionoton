import type { ItemMarket } from '@/utils/itemCache';
import useStorageQuery from './useStorageQuery';
import { useWowhead } from './useWowhead';

export function useItemMarket(auctionHouseId: number): ItemMarket {
  const { data: user } = useStorageQuery('user');
  const { version } = useWowhead();
  return { region: user?.region ?? 'eu', version: user?.version ?? version, auctionHouseId };
}
