import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

import time from 'utils/time';

import PageTooltip from './PageTooltip';
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
      uiState.keys[e.key] = true;
    });

    document.addEventListener('keyup', (e) => {
      uiState.keys[e.key] = false;
    });
  }, []);

  React.useEffect(() => {
    setIsItemPage(window.location.pathname.includes('item='));
  }, [window.location.pathname]);

  return (
    <>
      {isItemPage && <PageTooltip />}
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
