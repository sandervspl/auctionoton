const svgrPlugin = require('esbuild-plugin-svgr');

const env = process.env.NODE_ENV || 'development';
const DEV = env !== 'production';
const PROD = !DEV;

require('esbuild').build({
  entryPoints: {
    index: './src/modules/main/index.tsx',
    form: './src/modules/browserAction/form.tsx',
    background: './src/modules/background.ts',
  },
  platform: 'browser',
  bundle: true,
  watch: DEV && {
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
  sourcemap: DEV,
  outdir: 'dist',
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': JSON.stringify(env),
    __DEV__: JSON.stringify(DEV),
    __PROD__: JSON.stringify(PROD),
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
