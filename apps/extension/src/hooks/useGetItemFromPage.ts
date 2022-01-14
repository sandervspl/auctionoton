import * as i from 'types';
import React from 'react';

import { useStore } from 'state/store';


function useGetItemFromPage(): UseGetItemFromPage {
  const [item, setItem] = React.useState<i.PageItem>();
  const pathname = React.useRef(window.location.pathname);
  const user = useStore((store) => store.storage.user);

  React.useEffect(() => {
    // Get item name
    const itemName = getItemNameFromUrl(pathname.current);
    const itemIdSearch = getItemIdFromUrl(pathname.current);

    setItem({
      name: itemName || '',
      id: itemIdSearch || -1,
    });
  }, []);

  function getItemNameFromUrl(url?: string): string | undefined {
    const match = url?.match(/item=\d+\/([\w\d-]+)/);

    if (match) {
      return match[1];
    }
  }

  function isAuctionableItem(str: string | undefined): boolean {
    if (!str) {
      return false;
    }

    str = str.toLowerCase();

    return !str.includes('picked up') && !str.includes('quest');
  }

  function getItemIdFromUrl(url?: string): number | undefined {
    const match = url?.match(/item=(\d+)/);

    if (match) {
      return Number(match[1]);
    }
  }

  function generateNexushubUrl(): string | void {
    const server = user.server.classic?.slug;

    if (server) {
      const faction = user.faction[server]?.toLowerCase();

      return `https://nexushub.co/wow-classic/items/${server}-${faction}/${getItemNameFromUrl()}`;
    }
  }

  return {
    item: item,
    nexushubUrl: generateNexushubUrl(),
    isAuctionableItem,
    getItemIdFromUrl,
  };
}

interface UseGetItemFromPage {
  item?: i.PageItem;
  nexushubUrl: string | void;
  isAuctionableItem(str: string | undefined): boolean;
  getItemIdFromUrl(url?: string): number | undefined;
}

export default useGetItemFromPage;
