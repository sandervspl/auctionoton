import type {
  CachedItemDataClassic,
  GameVersion,
  ItemDataClassicResponse,
  Regions,
} from '../types';

export type ItemMarket = { region: Regions; version: GameVersion; auctionHouseId: number };
export const ITEM_CACHE_PREFIX = 'item-cache-v2:';
export const ITEM_CACHE_LIFETIME = 60 * 60 * 1000;
export const itemQueryKey = (market: ItemMarket, itemId: number) =>
  ['item', market.region, market.version, market.auctionHouseId, itemId] as const;
export const itemStorageKey = (market: ItemMarket, itemId: number) =>
  `${ITEM_CACHE_PREFIX}${market.region}:${market.version}:${market.auctionHouseId}:${itemId}`;

export function isItemData(value: unknown, itemId?: number): value is ItemDataClassicResponse {
  if (!value || typeof value !== 'object') return false;
  const item = value as ItemDataClassicResponse;
  const current = item.stats?.current;
  return (
    Number.isSafeInteger(item.itemId) &&
    item.itemId > 0 &&
    (itemId === undefined || item.itemId === itemId) &&
    typeof item.name === 'string' &&
    typeof item.uniqueName === 'string' &&
    !!current &&
    Number.isFinite(Date.parse(item.stats.lastUpdated)) &&
    [
      current.minBuyout,
      current.marketValue,
      current.historicalValue,
      current.quantity,
      current.numAuctions,
    ].every((value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
  );
}

export function isFreshItem(value: unknown, now = Date.now()): value is CachedItemDataClassic {
  if (!isItemData(value)) return false;
  const updated = Date.parse((value as CachedItemDataClassic).updatedAt);
  return updated <= now && now - updated < ITEM_CACHE_LIFETIME;
}

export interface ItemStorage {
  get(key: string | null): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export function createItemCache(storage: ItemStorage) {
  return {
    async get(market: ItemMarket, itemId: number) {
      const key = itemStorageKey(market, itemId);
      const item = (await storage.get(key))[key];
      return isFreshItem(item) && item.itemId === itemId ? item : undefined;
    },
    async set(market: ItemMarket, itemId: number, item: CachedItemDataClassic) {
      if (!isFreshItem(item) || item.itemId !== itemId) throw new Error('Invalid cached item');
      await storage.set({ [itemStorageKey(market, itemId)]: item });
    },
    async prune() {
      const entries = await storage.get(null);
      const expired = Object.entries(entries)
        .filter(
          ([key, value]) =>
            key === 'items' || (key.startsWith(ITEM_CACHE_PREFIX) && !isFreshItem(value)),
        )
        .map(([key]) => key);
      if (expired.length) await storage.remove(expired);
    },
  };
}
