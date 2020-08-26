import React from 'react';
import { Key } from 'w3c-keys';

import getBodyElement from 'utils/getBodyElement';

function useKeyboardEvent(keyFn: (key: typeof Key) => Key): boolean {
  const key = React.useRef(keyFn(Key));
  const [pressed, setPressed] = React.useState(false);

  function onKey(bool: boolean) {
    return function (e: KeyboardEvent) {
      if (e.key === key.current) {
        setPressed(bool);
      }
    };
  }

  React.useEffect(() => {
    const body = getBodyElement();

    body.addEventListener('keydown', onKey(true));
    body.addEventListener('keyup', onKey(false));

    return function cleanup() {
      body.removeEventListener('keydown', onKey(true));
      body.removeEventListener('keyup', onKey(false));
    };
  }, []);

  return pressed;
}

export default useKeyboardEvent;
