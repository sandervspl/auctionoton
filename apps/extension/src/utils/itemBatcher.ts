import type { ItemMarket } from './itemCache';

type BatchFetch<T> = (
  ids: number[],
  market: ItemMarket,
  signal: AbortSignal,
) => Promise<Map<number, T>>;
type Entry<T> = {
  id: number;
  resolve(value: T): void;
  reject(error: unknown): void;
  signal?: AbortSignal;
  abort(): void;
  batch?: { controller: AbortController; entries: Set<Entry<T>> };
};

export function createItemBatcher<T>(fetchBatch: BatchFetch<T>, delayMs = 20, maxBatch = 50) {
  const groups = new Map<
    string,
    { entries: Set<Entry<T>>; timer: ReturnType<typeof setTimeout> }
  >();
  async function dispatch(entries: Set<Entry<T>>, market: ItemMarket) {
    const batch = { controller: new AbortController(), entries };
    for (const entry of entries) entry.batch = batch;
    try {
      const items = await fetchBatch(
        [...new Set([...entries].map((entry) => entry.id))].sort((a, b) => a - b),
        market,
        batch.controller.signal,
      );
      for (const entry of entries) {
        const item = items.get(entry.id);
        if (item === undefined) entry.reject(new Error('Item not found on this realm.'));
        else entry.resolve(item);
      }
    } catch (error) {
      for (const entry of entries) entry.reject(error);
    } finally {
      for (const entry of entries) entry.signal?.removeEventListener('abort', entry.abort);
      entries.clear();
    }
  }
  return (id: number, market: ItemMarket, signal?: AbortSignal): Promise<T> => {
    if (signal?.aborted) return Promise.reject(signal.reason);
    const key = `${market.region}:${market.version}:${market.auctionHouseId}`;
    let group = groups.get(key);
    if (!group) {
      const entries = new Set<Entry<T>>();
      group = {
        entries,
        timer: setTimeout(() => {
          groups.delete(key);
          const byId = new Map<number, Entry<T>[]>();
          for (const entry of entries) byId.set(entry.id, [...(byId.get(entry.id) ?? []), entry]);
          const ids = [...byId.keys()];
          for (let offset = 0; offset < ids.length; offset += maxBatch) {
            void dispatch(
              new Set(ids.slice(offset, offset + maxBatch).flatMap((id) => byId.get(id)!)),
              market,
            );
          }
        }, delayMs),
      };
      groups.set(key, group);
    }
    const pending = group;
    return new Promise<T>((resolve, reject) => {
      const entry: Entry<T> = {
        id,
        resolve,
        reject,
        signal,
        abort() {
          pending.entries.delete(entry);
          if (pending.entries.size === 0 && groups.get(key) === pending) {
            clearTimeout(pending.timer);
            groups.delete(key);
          }
          entry.batch?.entries.delete(entry);
          if (entry.batch?.entries.size === 0) entry.batch.controller.abort();
          reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
        },
      };
      pending.entries.add(entry);
      signal?.addEventListener('abort', entry.abort, { once: true });
    });
  };
}
