import * as i from 'types';

export function createQueryKey(
  itemId: number,
  user: { server: string; faction: string; version?: string; region: string },
) {
  return [
    'item',
    {
      itemId,
      version: 'classic',
      ...user,
    },
  ] as i.ItemQueryKey;
}
