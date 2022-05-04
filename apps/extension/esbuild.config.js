/* eslint-disable @typescript-eslint/no-var-requires */
const svgrPlugin = require('esbuild-plugin-svgr');

const env = process.env.NODE_ENV || 'development';
const dev = env !== 'production';
const prod = !dev;

require('esbuild').build({
  entryPoints: {
    index: './src/modules/main/index.tsx',
    form: './src/modules/browserAction/form.tsx',
    background: './src/modules/background.ts',
  },
  platform: 'browser',
  bundle: true,
  watch: dev && {
    onRebuild(err) {
      if (err) console.error('watch build failed:', err);

      const fse = require('fs-extra');
      const notifier = require('node-notifier');

      fse.copySync('./src/modules/browserAction/form.html', './dist/form.html');

      notifier.notify({
        title: 'Auctionoton-extension',
        message: '📦 Rebuild complete',
      });
    },
  },
  sourcemap: dev,
  outdir: 'dist',
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    __DEV__: dev,
    __PROD__: prod,
    /** @TODO make endpoint */
    __CUR_CLASSIC_VERSION__: JSON.stringify('tbc'),
  },
  banner: {
    js: 'var addon = (chrome || browser);',
  },
  plugins: [
    svgrPlugin(),
  ],
})
  .then(() => {
    const fse = require('fs-extra');

    fse.copySync('./src/static', './dist/static');
    fse.copySync('./src/modules/browserAction/form.html', './dist/form.html');
    fse.copySync('./src/manifest.json', './dist/manifest.json');
  });
