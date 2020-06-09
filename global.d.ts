export declare global {
  interface Window {
    msBrowser: typeof browser;
  }

  /**
   * Global variable that is assigned to the browser's web extension API namespace.
   * See Webpack config .tsx module rule
   */
  const addon: typeof chrome;
}
