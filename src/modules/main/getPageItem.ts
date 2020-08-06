import * as i from 'types';

export function getItemNameFromUrl(url: string): string | undefined {
  const match = url.match(/item=\d+\/([\w\d-]+)/);

  if (match) {
    return match[1];
  }

  return;
}

function getPageItem(): i.PageItem {
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

export default getPageItem;
