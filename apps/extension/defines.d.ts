declare module '*.svg' {
  const value: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export = value;
}

declare const __API__: string;
declare const __CUR_CLASSIC_VERSION__: string;
declare const __DEV__: boolean;
