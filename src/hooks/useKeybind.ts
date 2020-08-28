import React from 'react';
import { Key } from 'w3c-keys';

import { useStore } from 'state/store';


function useKeybind(keyFn: (key: typeof Key) => Key): boolean {
  const key = React.useRef(keyFn(Key));
  const pressed = useStore((store) => store.ui.keys[key.current] || false);

  return pressed;
}

export default useKeybind;
