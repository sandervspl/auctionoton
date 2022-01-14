import React from 'react';
import ReactDOM from 'react-dom';
import { Key } from 'w3c-keys';

import { useStore } from 'state/store';
import { ELEMENT_ID } from 'src/constants';
import getBodyElement from 'utils/getBodyElement';

import Root from './Root';


function keybinds() {
  const { set } = useStore.getState();

  // Ugly for now until I need more keybinds
  window.addEventListener('keydown', (e) => {
    if (e.key === Key.Shift) {
      set((store) => {
        store.ui.keys[Key.Shift] = true;
      });
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === Key.Shift) {
      set((store) => {
        store.ui.keys[Key.Shift] = false;
      });
    }
  });
}

async function main(): Promise<void> {
  keybinds();

  // Initialize short term cache
  await useStore.getState().storage.actions.init();

  // Generate a root element for React to render on
  const rootElement = document.createElement('span');
  rootElement.id = ELEMENT_ID.ROOT;
  rootElement.style.display = 'none';

  getBodyElement().appendChild(rootElement);

  ReactDOM.render(<Root />, rootElement);
}

main();
