import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import clearDist from 'rollup-plugin-delete';
import { chromeExtension } from 'rollup-plugin-chrome-extension';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import svg from 'rollup-plugin-svg';
import zip from 'rollup-plugin-zip';
import config from './config';

const rollup = [{
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    clearDist({ targets: 'dist/*' }),
    chromeExtension(),
    svg(),
    resolve(),
    commonjs(),
    typescript(),
    injectProcessEnv({
      NODE_ENV: process.env.NODE_ENV,
      API: config.api[process.env.NODE_ENV],
    }),
  ],
}, {
  input: 'src/form.ts',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
  ],
}];

if (process.env.NODE_ENV === 'production') {
  rollup[1].plugins.push(
    zip({
      dir: '.',
    }),
  );
}

export default rollup;
