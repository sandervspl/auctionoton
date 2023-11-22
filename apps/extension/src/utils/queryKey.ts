import * as i from 'types';
import { getVersion } from './version';

export function createQueryKey(
  itemId: number,
  user: { server: string; faction: string; version?: string; region: string },
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
