/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const rimraf = require('rimraf');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const config = require('./config');

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

// Remove dist dir
rimraf.sync('./dist');

// Remove config
const webpackConfig = {
  mode: isProduction ? 'production' : 'development',
  ...!isProduction && { devtool: 'inline-source-maps' },
  entry: {
    index: './src/modules/main/index.tsx',
    form: './src/modules/browserAction/form.tsx',
    background: './src/modules/background.ts',
  },
  output: {
    path: path.resolve('dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          'ts-loader',
          // Add a global variable 'addon' to all TS files that is assigned to the browser's web extension API namespace
          'imports-loader?addon=>(chrome||browser)',
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.svg$/,
        use: '@svgr/webpack',
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
    plugins: [
      new TsconfigPathsPlugin(),
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/static', to: 'static' },
        { from: 'src/modules/browserAction/form.html', to: '.' },
        { from: 'src/manifest.json', to: '.' },
      ],
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(env),
      },
      __DEV__: !isProduction,
      __API__: JSON.stringify(config.api[env]),
    }),
  ],
};

module.exports = webpackConfig;
