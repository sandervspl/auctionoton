import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Key } from 'w3c-keys';

import time from 'utils/time';

import PageTooltip from './PageTooltip';
import TableBuyout from './TableBuyout';
import HoverTooltip from './HoverTooltip';
import { uiState } from './state';
import { ReagentsTooltip } from './ReagentsTooltip';

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
  // Check if there is an anchor to the create spell page
  const createSpellAnchor = document.querySelector('#tab-created-by-spell a[href*="spell="]');

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
      {isItemPage && <PageTooltip />}
      {(isSpellPage || createSpellAnchor) && <ReagentsTooltip />}
      {window.location.pathname.includes('/items/') && <TableBuyout />}
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
