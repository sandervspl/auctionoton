import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import clearDist from 'rollup-plugin-delete';
import { chromeExtension, pushReloader } from 'rollup-plugin-chrome-extension';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import config from './config';

const rollup = {
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    clearDist({ targets: 'dist/*' }),
    chromeExtension(),
    resolve(),
    commonjs(),
    typescript(),
    injectProcessEnv({
      NODE_ENV: process.env.NODE_ENV,
      API: config.api[process.env.NODE_ENV],
    }),
  ],
};

if (process.env.NODE_ENV === 'development') {
  rollup.plugins.push(
    pushReloader(),
  );
}

export default rollup;
