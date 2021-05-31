import { useStore } from 'state/store';
import * as i from 'types';


export function getItemNameFromUrl(url?: string): string | undefined {
  const match = url?.match(/item=\d+\/([\w\d-]+)/);

  if (match) {
    return match[1];
  }

  return;
}

export function getItemFromPage(): i.PageItem {
  const item = {} as i.PageItem;
  const pathname = window.location.pathname;

  // Get item name
  const itemName = getItemNameFromUrl(pathname);

  if (itemName) {
    item.name = itemName;
  }

  const itemIdSearch = pathname.match(/\d+/);

  if (itemIdSearch) {
    item.id = itemIdSearch[0];
  }

  return item;
}

export function isAuctionableItem(str: string | undefined): boolean {
  if (!str) {
    return false;
  }

  str = str.toLowerCase();

  return !str.includes('picked up') && !str.includes('quest');
}

export function generateUrl(item: string): string {
  const user = useStore.getState().storage.user;

  return `https://nexushub.co/wow-classic/items/${user.server.slug}-${user.faction}/${item}`;
}
