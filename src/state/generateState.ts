import * as i from 'types';

import { store } from './store';

function generateState(set: i.Set, get: i.Get): i.State {
  const modState = store(set, get);
  const state = {
    set: modState.set,
  } as i.State;

  for (const key in modState.modules) {
    // @ts-ignore idk how to fix this error. It infers as & instead of |.
    state[key] = modState.modules[key](set, get);
  }

  return state;
}

export default generateState;
