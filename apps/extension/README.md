# Auctionoton extension

WXT builds the Wowhead extension for Chrome and Firefox. Run commands from the repository root, using Node.js 22 or newer and pnpm 10.7.1. The exact development Node version is in `.node-version`.

```sh
pnpm install --frozen-lockfile
pnpm dev:extension
```

Development and packaged extensions call `https://auctionoton-staging-backend.sandervispoel.workers.dev`. No local API or Bun process is needed. `api.config.ts` supplies the API origin, manifest permission, and WXT development proxy from one place. WXT normally serves development assets on port 3000; legacy `/realms/` and `/item/` requests to that port are forwarded to staging.

After updating source, restart `pnpm dev:extension` and reload the extension in the browser. Previously extracted source ZIPs are independent copies: use the current checkout or regenerate them with `pnpm zip:firefox`. Staging lists all supported realms, but currently stores auction prices only for the configured trial market.

`pnpm --filter @auctionoton/extension test:dev` starts WXT without opening a browser and checks that localhost realm/item paths proxy to the configured upstream. It uses a local fixture, so CI needs no provider credentials.

For Firefox development, run `pnpm --filter @auctionoton/extension dev:firefox`.

## Rebuild from source for Mozilla

Extract `auctionoton-sources.zip` and open a terminal in its root directory, where `pnpm-workspace.yaml` lives. Install Node.js using the version in `.node-version`, then run:

```sh
npm install --global pnpm@10.7.1
pnpm install --frozen-lockfile
pnpm build:firefox
```

The extension does not require Bun to build. The Firefox bundle appears in `apps/extension/.output/firefox-mv3/`. Run `pnpm zip:firefox` to produce `apps/extension/.output/auctionoton-firefox.zip` and a new source archive. The source archive includes the workspace files and shared TypeScript configuration needed for a reproducible build.
