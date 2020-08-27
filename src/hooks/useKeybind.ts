import React from 'react';
import { Key } from 'w3c-keys';

import { useStore } from 'state/store';


function useKeybind(keyFn: (key: typeof Key) => Key): boolean {
  const key = React.useRef(keyFn(Key));
  const keys = useStore((store) => store.ui.keys);
  const [pressed, setPressed] = React.useState(keys[key.current] || false);

  React.useEffect(() => {
    setPressed(keys[key.current]);
  }, [keys]);

  return pressed;
}

export default useKeybind;
