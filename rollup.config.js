import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import clearDist from 'rollup-plugin-delete';
import { chromeExtension, pushReloader } from 'rollup-plugin-chrome-extension';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import config from './config';

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  external: [
    'cash-dom',
  ],
  plugins: [
    clearDist({ targets: 'dist/*' }),
    chromeExtension(),
    resolve(),
    commonjs(),
    typescript(),
    pushReloader(),
    injectProcessEnv({
      /* eslint-disable no-undef */
      NODE_ENV: process.env.NODE_ENV,
      API: config.api[process.env.NODE_ENV],
      /* eslint-enable */
    }),
  ],
};
