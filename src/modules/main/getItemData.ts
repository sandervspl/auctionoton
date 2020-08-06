type PageItem = {
  name: string;
  id: string;
}

function getItemData(): PageItem {
  const item = {} as PageItem;
  const pathname = window.location.pathname;

  // Get item name
  const itemNameSearch = pathname.match(/item=\d+\/([\w\d-]+)/);

  if (itemNameSearch) {
    item.name = itemNameSearch[1];
  }

  const itemIdSearch = pathname.match(/\d+/);

  if (itemIdSearch) {
    item.id = itemIdSearch[0];
  }

  return item;
}

export default getItemData;
