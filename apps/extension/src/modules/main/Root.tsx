import React from 'react';
import { QueryClient, QueryClientProvider, useMutation } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Key } from 'w3c-keys';

import time from 'utils/time';
import asyncStorage from 'utils/asyncStorage';

import PageTooltip from './PageTooltip';
import HoverTooltip from './HoverTooltip';

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
  const uiMutation = useMutation(([key, bool]: [string, boolean]) => {
    return asyncStorage.set('ui', (draft) => {
      draft.keys[key] = bool;
    });
  });
  const [isItemPage, setIsItemPage] = React.useState(window.location.pathname.includes('item='));

  React.useEffect(() => {
    // Ugly for now until I need more keybinds
    window.addEventListener('keydown', (e) => {
      if (e.key === Key.Shift) {
        uiMutation.mutate([Key.Shift, true]);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === Key.Shift) {
        uiMutation.mutate([Key.Shift, false]);
      }
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
