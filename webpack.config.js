/* eslint-disable @typescript-eslint/no-var-requires */
const rimraf = require('rimraf');
const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const config = require('./config');

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

// Remove dist dir
rimraf.sync('./dist');

// Remove config
const webpackConfig = {
  mode: isProduction ? 'production' : 'development',
  entry: {
    index: ['./src/polyfill.ts', './src/index.ts'],
    form: ['./src/polyfill.ts', './src/form.ts'],
    background: ['./src/polyfill.ts', './src/background.ts'],
  },
  output: {
    path: path.resolve('dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.svg$/,
        loader: 'svg-inline-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/static', to: 'static' },
        { from: 'src/form.html', to: '.' },
        { from: 'src/manifest.json', to: '.' },
      ],
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(env),
      },
      __API__: JSON.stringify(config.api[env]),
    }),
  ],
};

module.exports = webpackConfig;
