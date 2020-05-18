// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { rollup } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import clearDist from 'rollup-plugin-delete';
import { chromeExtension, pushReloader } from 'rollup-plugin-chrome-extension';

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    clearDist({ targets: 'dist/*' }),
    chromeExtension(),
    pushReloader(),
    typescript(),
    // the plugins below are optional
    resolve(),
    commonjs(),
  ],
};
