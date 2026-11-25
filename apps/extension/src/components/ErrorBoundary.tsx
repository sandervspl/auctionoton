import * as React from 'react';

type Props = {
  children: React.ReactNode;
  /** Shown instead of the children after they throw. */
  fallback?: React.ReactNode;
  /** Changing this value clears the error, e.g. a new item or realm. */
  resetKey?: unknown;
};

type State = { error: Error | null; resetKey: unknown };

/** Keeps one broken widget from removing the rest of Auctionoton from the page. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return Object.is(props.resetKey, state.resetKey)
      ? null
      : { error: null, resetKey: props.resetKey };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Auctionoton failed to render', error, info.componentStack);
  }

  render() {
    return this.state.error ? (this.props.fallback ?? null) : this.props.children;
  }
}

export const PriceErrorMessage = () => (
  <p className="auc-mt-2 auc-text-red-500">
    Auctionoton couldn't show prices here. Reload the page to try again.
  </p>
);
