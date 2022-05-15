import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Key } from 'w3c-keys';

import time from 'utils/time';

import ItemPageTooltip from './ItemPageTooltip';
import HoverTooltip from './HoverTooltip';
import { uiState } from './state';

class AppContainer extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    return (
      <App />
    );
  }
}

const App: React.VFC = () => {
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
      {isItemPage && <ItemPageTooltip />}
      <HoverTooltip />
    </>
  );
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: time.minutes(5),
      cacheTime: time.minutes(10),
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
