import * as i from 'types';
import React from 'react';


function useGetPageData(): UseGetPageData {
  const [data, setData] = React.useState<i.PageData>();
  const pathname = React.useRef(window.location.pathname);

  React.useEffect(() => {
    const name = getNameFromUrl(pathname.current);
    const idSearch = getIdFromUrl(pathname.current);

    setData({
      name: name || '',
      id: idSearch || -1,
    });
  }, []);

  function getNameFromUrl(url?: string): string | undefined {
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

  function getIdFromUrl(url?: string): number | undefined {
    const match = url?.match(/(item|spell)=(\d+)/);

    if (match) {
      return Number(match[1]);
    }
  }

  return {
    data,
    isAuctionableItem,
    getIdFromUrl,
  };
}

interface UseGetPageData {
  data?: i.PageData;
  isAuctionableItem(str: string | undefined): boolean;
  getIdFromUrl(url?: string): number | undefined;
}

export default useGetPageData;
