import * as i from 'types';


const initialState: i.UiState = {
  keys: {},
};

function uiStore(set: i.Set, get: i.Get): i.UiStore {
  return {
    ...initialState,
  };
}

export default uiStore;
