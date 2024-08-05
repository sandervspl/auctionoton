import { ConfigEnv } from 'wxt';

declare module '*.svg' {
  const value: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export = value;
}

declare const __DEV__: boolean;
declare const __VITE_ENV__: ConfigEnv;
