import React from 'react';


function useIsClassicWowhead(): boolean {
  const isClassic = React.useRef<boolean>(isClassicWowhead());

  function isClassicWowhead(): boolean {
    return window.location.host.includes(__CUR_CLASSIC_VERSION__);
  }

  return isClassic.current;
}

export default useIsClassicWowhead;
