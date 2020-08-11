import React from 'react';

import PageTooltip from './PageTooltip';
import HoverTooltip from './HoverTooltip';


class App extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    return this.props.children;
  }
}


const Root = (): JSX.Element => {
  const isItemPage = window.location.pathname.includes('item=');

  return (
    <App>
      {isItemPage && <PageTooltip />}
      <HoverTooltip />
    </App>
  );
};

export default Root;
