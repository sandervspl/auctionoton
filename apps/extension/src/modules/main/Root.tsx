import React from 'react';
import { Key } from 'w3c-keys';

import { ItemPage } from './routes/ItemPage';
import { SpellPage } from './routes/SpellPage';
import ItemsPage from './routes/ItemsPage';
import HoverTooltip from './HoverTooltip';
import { uiState } from './state';
import { Providers } from './Providers';

class AppContainer extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    return <App />;
  }
}

const App: React.FC = () => {
  const isItemPage = window.location.pathname.includes('item=');
  const isSpellPage = window.location.pathname.includes('spell=');
  const isItemsPage = window.location.pathname.includes('/items/');

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      uiState.keys[e.key as Key] = true;
    }

    function onKeyUp(e: KeyboardEvent) {
      uiState.keys[e.key as Key] = false;
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  console.log({ isItemPage, isItemsPage, isSpellPage });

  return (
    <>
      {isItemPage && <ItemPage />}
      {isItemsPage && <ItemsPage />}
      {isSpellPage && <SpellPage />}
      <HoverTooltip />
    </>
  );
};

export const Root = (): JSX.Element => {
  return (
    <Providers>
      <AppContainer />
    </Providers>
  );
};
