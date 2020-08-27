import * as i from 'types';

import { store } from './store';


function generateStore(set: i.Set, get: i.Get): i.Store {
  const tempStore = store(set, get);
  const initStore = {
    set: tempStore.set,
  } as i.Store;

  delete tempStore.set;

  for (const key in tempStore) {
    // @ts-ignore idk how to fix this error. It infers as & instead of |.
    initStore[key] = tempStore[key](set, get);
  }

  return initStore;
}

export default generateStore;
