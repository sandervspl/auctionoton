import * as i from 'types';
import React from 'react';

function useGetSpellFromPage(): UseGetSpellFromPage {
  const [spell, setSpell] = React.useState<i.PageItem>();
  const pathname = React.useRef(window.location.pathname);

  React.useEffect(() => {
    // Get spell name
    const spellName = getSpellNameFromUrl(pathname.current);
    const spellIdSearch = getSpellIdFromUrl(pathname.current);

    setSpell({
      name: spellName || '',
      id: spellIdSearch || -1,
    });
  }, []);

  function getSpellNameFromUrl(url?: string): string | undefined {
    const match = url?.match(/spell=\d+\/([\w\d-]+)/);

    if (match) {
      return match[1];
    }
  }

  function getSpellIdFromUrl(url?: string): number | undefined {
    const match = url?.match(/spell=(\d+)/);

    if (match) {
      return Number(match[1]);
    }
  }

  return {
    spell,
    getSpellIdFromUrl,
  };
}

interface UseGetSpellFromPage {
  spell?: i.PageItem;
  getSpellIdFromUrl(url?: string): number | undefined;
}

export default useGetSpellFromPage;
