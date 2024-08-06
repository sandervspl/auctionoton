import * as i from 'types';
import { storage } from 'wxt/storage';
import { produce } from 'immer';

export async function getItemsFromStorage() {
  const curItems = (await storage.getItem<i.ItemsData>('local:items')) ?? ({} as i.ItemsData);
  return curItems;
}

export async function getItemFromStorage(auctionHouseId: number, itemId: number) {
  const curItems = (await storage.getItem<i.ItemsData>('local:items')) ?? ({} as i.ItemsData);
  const itemFromStorage = curItems[`${auctionHouseId}:${itemId}`];

  return itemFromStorage as i.CachedItemDataClassic | undefined;
}

export async function addItemToStorage(
  auctionHouseId: number,
  itemId: number,
  item: i.CachedItemDataClassic,
) {
  const curItems = await getItemsFromStorage();
  const nextItems = produce(curItems, (draft) => {
    draft[`${auctionHouseId}:${itemId}`] = item;
  });
  await storage.setItem('local:items', nextItems);
}
