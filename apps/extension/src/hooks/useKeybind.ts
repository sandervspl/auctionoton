import React from 'react';
import { Key } from 'w3c-keys';
import useStorageQuery from './useStorageQuery';

/** @TODO broken */
function useKeybind(keyFn: (key: typeof Key) => Key): boolean {
  const key = React.useRef(keyFn(Key));
  const { data: ui } = useStorageQuery('ui');

  const pressed = ui?.keys[key.current] || false;

  return pressed;
}

export default useKeybind;
