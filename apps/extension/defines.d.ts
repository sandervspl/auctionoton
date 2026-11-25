import type { ConfigEnv } from 'wxt';

declare module '*.svg' {
  const value: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export = value;
}

declare global {
  const __DEV__: boolean;
  const __PROD__: boolean;
  const __VITE_ENV__: ConfigEnv;
}
