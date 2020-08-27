import * as i from 'types';


const initialState: i.UiState = {
  keys: {},
  shownTip: {
    shiftKey: false,
  },
};

function uiStore(set: i.Set, get: i.Get): i.UiStore {
  return {
    ...initialState,
  };
}

export default uiStore;
