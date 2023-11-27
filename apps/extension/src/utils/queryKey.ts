import * as i from 'types';
import { getVersion } from './version';

export function createQueryKey(
  itemId: number,
  user: { realm: string; faction: string; version?: i.Version; region: i.Regions },
  version?: i.Version,
) {
  return [
    'item',
    {
      itemId,
      version: version ?? getVersion(),
      ...user,
    },
  ] as i.ItemQueryKey;
}
