import * as i from 'types';


function uiState(set: i.Set, get: i.Get): i.UiState {
  return {
    keys: {},
    shownTip: {
      shiftKey: false,
    },
  };
}

export default uiState;
