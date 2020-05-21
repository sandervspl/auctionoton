import generateTooltip from './tooltip';

(async (): Promise<void> => {
  // Get item name
  const itemNameSearch = window.location.pathname.match(/item=\d+\/([\w\d-]+)/);

  if (!itemNameSearch) {
    console.error('No item name found');
    return;
  }

  const itemName = itemNameSearch[1];
  const pathname = window.location.pathname;
  const itemIdSearch = /\d+/.exec(pathname);

  if (!itemIdSearch) {
    console.error('No item id found');
    return;
  }

  const itemId = itemIdSearch[0];
  const tooltipElementId = `tt${itemId}`;
  const tooltipElement = document.querySelector(`#${tooltipElementId}`) as HTMLElement;

  if (!tooltipElement) {
    console.error('No tooltip element found');
    return;
  }

  // Remove the fixed width
  tooltipElement.style.width = 'auto';

  await generateTooltip(tooltipElement, itemName);
})();
