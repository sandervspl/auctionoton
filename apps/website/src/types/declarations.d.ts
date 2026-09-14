// REQUIRED TO TURN THIS FILE INTO A MODULE -- DO NOT REMOVE
// biome-ignore lint/style/useExportType: need this
export {};

// global variables
declare global {
  declare const __DEV__: boolean;
  declare const __PROD__: boolean;
  declare const __ACC__: boolean;
  declare const __TEST__: boolean;
  declare const __API_URL__: string;

  // Add process.env types
  declare namespace NodeJS {
    interface ProcessEnv {
      APP_ENV: 'development' | 'acceptance' | 'production';
      TEST_SITE_URL: string;
      ACC_SITE_URL: string;
      PROD_SITE_URL: string;
    }
  }

  // Add window types
  // biome-ignore lint/suspicious/noEmptyInterface: leave it empty for future use
  interface Window {
    // add properties here
  }
}

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}
