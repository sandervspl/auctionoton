import * as i from 'types';

export function getItemQueryKey(itemId: number | undefined, user: i.MemoUser): i.ItemQueryKey {
  return ['item', {
    itemId,
    server: user.server,
    faction: user.faction,
    version: user.version,
    region: user.region,
  }] as i.ItemQueryKey;
}
