# Auctionoton extension

WXT builds the Wowhead extension for Chrome and Firefox. Run commands from the repository root, using Node.js 22 or newer and pnpm 10.7.1. The exact development Node version is in `.node-version`.

```sh
pnpm install --frozen-lockfile
pnpm dev:extension
```

The development extension calls the Bun API at `http://localhost:3000`. Start it with `pnpm dev:server` after configuring its environment. Production builds call `https://auctionoton-api.sandervspl.dev`.

For Firefox development, run `pnpm --filter @auctionoton/extension dev:firefox`.

## Rebuild from source for Mozilla

Extract `auctionoton-sources.zip` and open a terminal in its root directory, where `pnpm-workspace.yaml` lives. Install Node.js using the version in `.node-version`, then run:

```sh
npm install --global pnpm@10.7.1
pnpm install --frozen-lockfile
pnpm build:firefox
```

The extension does not require Bun to build. The Firefox bundle appears in `apps/extension/.output/firefox-mv3/`. Run `pnpm zip:firefox` to produce `apps/extension/.output/auctionoton-firefox.zip` and a new source archive. The source archive includes the workspace files and shared TypeScript configuration needed for a reproducible build.
