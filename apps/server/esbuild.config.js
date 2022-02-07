const path = require('path');
const { fork } = require('child_process');
const { esbuildDecorators } = require('@anatine/esbuild-decorators');

const DEV = process.env.NODE_ENV !== 'production';

// Fork process to start/kill app with
let nodeFork;

function onBuildComplete() {
  if (DEV) {
    require('node-notifier').notify({
      title: 'Auctionoton Server',
      message: 'Build complete!',
    });

    // Run app with node
    nodeFork?.kill();
    nodeFork = fork(path.resolve(__dirname, 'dist/bundle.js'));
  }
}

function build() {
  require('esbuild').build({
    entryPoints: ['src/Server.ts'],
    outfile: 'dist/bundle.js',
    bundle: true,
    platform: 'node',
    target: ['node14'],
    plugins: [
      esbuildDecorators(),
    ],
    external: Object.keys(require('./package.json').dependencies),
    watch: DEV && {
      onRebuild(err) {
        if (err) {
          console.error('watch build failed:', err);
          process.exit(1);
        }

        console.info('🚧 Rebuild complete!\n');
        onBuildComplete();
      },
    },
  })
    .catch(() => process.exit(1));

  console.info('🚧 Build complete!\n');
  onBuildComplete();
}

build();
