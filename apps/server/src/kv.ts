/** Temporary in-memory KV store */

function createKV() {
  const store = new Map<string, any>();

  return {
    async get<T>(key: string): Promise<T | null> {
      return store.get(key) || null;
    },
    async set<T>(key: string, value: T, options: { ex: number }) {
      store.set(key, value);

      setTimeout(() => {
        store.delete(key);
      }, options.ex * 1000);
    },
  };
}

export const kv = createKV();
