import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Key } from 'w3c-keys';

import time from 'utils/time';

import { ItemPage } from './routes/ItemPage';
import { SpellPage } from './routes/SpellPage';
import ItemsPage from './routes/ItemsPage';
import HoverTooltip from './HoverTooltip';
import { uiState } from './state';

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

  function onKeyDown(e: KeyboardEvent) {
    uiState.keys[e.key as Key] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    uiState.keys[e.key as Key] = false;
  }

  React.useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return (
    <>
      {isItemPage && <ItemPage />}
      {isItemsPage && <ItemsPage />}
      {isSpellPage && <SpellPage />}
      <HoverTooltip />
    </>
  );
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: time.minutes(30),
      gcTime: time.hours(1),
      retryOnMount: false,
    },
  },
});

const Root = (): JSX.Element => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContainer />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
};

export default Root;
