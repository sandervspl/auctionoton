import { createItemCache } from './itemCache';

export const itemCache = createItemCache({
  get: (key) => browser.storage.local.get(key),
  set: (values) => browser.storage.local.set(values),
  remove: (keys) => browser.storage.local.remove(keys),
});
