import * as i from 'types';

import { store } from './store';


function generateStore(set: i.ZustandSet, get: i.Get): i.Store {
  // Initialize our state
  const tempStore = store(set, get);
  const initStore = {
    set: tempStore.set,
  } as i.Store;

  // Remove the set fn
  delete tempStore.set;

  // Initialize the individual stores with getter/setter functions
  for (const key in tempStore) {
    // @ts-ignore idk how to fix this error. It infers as & instead of |.
    initStore[key] = tempStore[key](initStore.set, get);
  }

  return initStore;
}

export default generateStore;
