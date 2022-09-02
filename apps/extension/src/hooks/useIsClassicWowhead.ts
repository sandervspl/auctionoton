import React from 'react';


function useIsClassicWowhead(): boolean {
  const isClassic = React.useRef<boolean>(isClassicWowhead());

  function isClassicWowhead(): boolean {
    const { href } = window.location;
    return href.startsWith('https://tbc.wowhead.com') || href.includes('wowhead.com/wotlk');
  }

  return isClassic.current;
}

export default useIsClassicWowhead;
