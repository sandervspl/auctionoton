import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Key } from 'w3c-keys';

import time from 'utils/time';

import PageTooltip from './PageTooltip';
import TableBuyout from './TableBuyout';
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
  const [isItemPage, setIsItemPage] = React.useState(window.location.pathname.includes('item='));

  React.useEffect(() => {
    window.addEventListener('keydown', (e) => {
      uiState.keys[e.key as Key] = true;
    });

    document.addEventListener('keyup', (e) => {
      uiState.keys[e.key as Key] = false;
    });
  }, []);

  React.useEffect(() => {
    setIsItemPage(window.location.pathname.includes('item='));
  }, [window.location.pathname]);

  return (
    <>
      {isItemPage && <PageTooltip />}
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
      cacheTime: Infinity,
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
