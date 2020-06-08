export declare global {
  interface Window {
    browser: typeof chrome;
    msBrowser: typeof chrome;
  }

  const browser: typeof chrome;
}
