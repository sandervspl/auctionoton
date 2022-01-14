import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import PageTooltip from './PageTooltip';
import HoverTooltip from './HoverTooltip';

class App extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    const isItemPage = window.location.pathname.includes('item=');

    return (
      <>
        {isItemPage && <PageTooltip />}
        <HoverTooltip />
      </>
    );
  }
}

// Create a client
const queryClient = new QueryClient();

const Root = (): JSX.Element => {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

export default Root;
