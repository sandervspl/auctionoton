import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
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

  React.useEffect(() => {
    window.addEventListener('keydown', (e) => {
      uiState.keys[e.key as Key] = true;
    });

    document.addEventListener('keyup', (e) => {
      uiState.keys[e.key as Key] = false;
    });
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
      cacheTime: time.hours(5),
      retryOnMount: false,
      notifyOnChangeProps: 'tracked',
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
