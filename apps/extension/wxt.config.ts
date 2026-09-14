import { defineConfig } from 'wxt';
import banner from 'vite-plugin-banner';
import { fileURLToPath } from 'node:url';
import { apiOrigin, apiProxy } from './api.config';

const nodeEnv = process.env.NODE_ENV || 'development';
const DEV = nodeEnv !== 'production';
const PROD = !DEV;

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  modulesDir: 'src/wxtModules',
  zip: {
    artifactTemplate: 'auctionoton-{{browser}}.zip',
    sourcesTemplate: 'auctionoton-sources.zip',
    // Firefox reviewers need the workspace lockfile and shared configuration too.
    sourcesRoot: fileURLToPath(new URL('../..', import.meta.url)),
    includeSources: ['.node-version', '.npmrc'],
    excludeSources: [
      '**/build/**',
      '**/dist/**',
      '**/store/**',
      '**/src/styled-system/**',
      '**/*.tsbuildinfo',
      '**/*.zip',
      '**/*.log',
      // WXT's source archiver does not read .gitignore.
      '**/deploy.secrets.sh',
      '**/.secrets/**',
      '**/*.pem',
      '**/*.key',
      '**/*.db',
      '**/*.db-*',
      '**/*.sqlite',
      '**/*.sqlite3',
      '**/AuctionDB.lua',
      '**/db.json',
      '**/auctionoton-server/**',
    ],
  },
  runner: {
    chromiumArgs: ['--disable-search-engine-choice-screen', '--start-maximized'],
    startUrls: [
      'https://www.wowhead.com/classic/item=12360/arcanite-bar', // Item Page
      'https://www.wowhead.com/classic/spell=23638/black-amnesty', // Spell Page
      'https://www.wowhead.com/classic/items/trade-goods/cloth', // Items Page
    ],
    keepProfileChanges: true,
  },
  alias: {
    types: 'src/types/index.ts',
    utils: 'src/utils/index.ts',
  },
  manifest: {
    permissions: ['storage'],
    host_permissions: [`${apiOrigin}/*`],
  },
  vite: (env) => ({
    // Older loaded dev bundles call the WXT origin. Keep those API paths working
    // while the popup/content scripts reload; localhost only serves development assets.
    server: { proxy: apiProxy },
    plugins: [
      banner({
        content: 'var addon = (chrome || browser);',
        outDir: '.output',
      }),
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
      __VITE_ENV__: JSON.stringify(env),
      __DEV__: JSON.stringify(DEV),
      __PROD__: JSON.stringify(PROD),
    },
  }),
});
