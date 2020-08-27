import * as i from 'types';


function uiStore(set: i.Set, get: i.Get): i.UiStore {
  return {
    keys: {},
    shownTip: {
      shiftKey: false,
    },
  };
}

export default uiStore;
