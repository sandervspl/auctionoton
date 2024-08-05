import { defineConfig } from 'wxt';
import svgr from 'vite-plugin-svgr';
import banner from 'vite-plugin-banner';

const env = process.env.NODE_ENV || 'development';
const DEV = env !== 'production';
const PROD = !DEV;

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  modulesDir: 'src/wxtModules',
  runner: {
    chromiumArgs: ['--disable-search-engine-choice-screen'],
  },
  alias: {
    utils: 'src/utils/index.ts',
  },
  manifest: {
    permissions: [
      'storage',
      'https://*.ngrok.io/*',
      'https://5d9b-82-168-31-31.ngrok.io/*',
      'https://auctionoton-edge-api-sandervspl.vercel.app/api/*',
      'https://auctionoton-edge-api.vercel.app/api/*',
      'https://auctionoton-api-valor.vercel.app/api/*',
      'https://auctionoton-api.vercel.app/api/*',
      'https://auctionoton-api.sandervspl.dev/*',
    ],
  },
  vite: (env) => ({
    plugins: [
      banner({
        content: 'var addon = (chrome || browser);',
        outDir: '.output',
      }),
      svgr(),
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
      __DEV__: JSON.stringify(DEV),
      __PROD__: JSON.stringify(PROD),
    },
  }),
});
