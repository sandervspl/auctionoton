import * as i from 'types';
import React from 'react';

function useGetItemFromPage(): UseGetItemFromPage {
  const pathname = React.useRef(window.location.pathname);
  const itemName = getItemNameFromUrl(pathname.current);
  const itemIdSearch = getItemIdFromUrl(pathname.current);
  const isCraftableItem = !!document.querySelector('#tab-created-by-spell a[href*="spell="]');

  function getItemNameFromUrl(url?: string): string | undefined {
    const match = url?.match(/item=\d+\/([\w\d-]+)/);

    if (match) {
      return match[1];
    }
  }

  function getIsAuctionableItem(str: string | undefined): boolean {
    if (!str) {
      return false;
    }

    str = str.toLowerCase();

    return !str.includes('picked up') && !str.includes('quest item');
  }

  function getItemIdFromUrl(url?: string): number | undefined {
    const match = url?.match(/item=(\d+)/);

    if (match) {
      return Number(match[1]);
    }
  }

  return {
    item: {
      name: itemName || '',
      id: itemIdSearch || -1,
    },
    getIsAuctionableItem,
    getItemIdFromUrl,
    isCraftableItem,
  };
}

interface UseGetItemFromPage {
  item?: i.PageItem;
  getIsAuctionableItem(str: string | undefined): boolean;
  getItemIdFromUrl(url?: string): number | undefined;
  isCraftableItem: boolean;
}

export default useGetItemFromPage;
