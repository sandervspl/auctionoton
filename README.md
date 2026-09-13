# Auctionoton

Auction House prices for World of Warcraft, with a Wowhead browser extension, a website, and a Bun API. This repository uses pnpm workspaces and Turborepo.

Download the extension for [Chrome, Brave, Edge, and Opera](https://chrome.google.com/webstore/detail/auctionoton-auction-house/ffflgkmjodhdladikaglbeofemhbojio) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/auctionoton/).

## Get started

Use Node.js 22 or newer (`.node-version` pins the development and CI version), pnpm 10.7.1, and Bun 1.3.14 for the API.

```sh
npm install --global pnpm@10.7.1
pnpm install --frozen-lockfile
pnpm dev:extension
```

WXT generates its TypeScript configuration during installation. It opens a browser with the development extension loaded. For Firefox, run `pnpm --filter @auctionoton/extension dev:firefox`.

For the website and API, copy the app's environment example and fill in its credentials:

```sh
cp apps/server/.env.example apps/server/.env
cp apps/website/.env.example apps/website/.env.local
pnpm dev
```

The API listens on `http://localhost:3000`; the website uses `http://localhost:3001`. WXT runs its own development server. The API needs PostgreSQL and Redis, while the website needs PostgreSQL and Clerk keys. `pnpm dev:server` and `pnpm dev:website` start either app alone.

## Workspace

| Directory | Package | Purpose |
| --- | --- | --- |
| `apps/extension` | `@auctionoton/extension` | WXT extension for Chrome and Firefox |
| `apps/server` | `@auctionoton/server` | Elysia API, ingestion scripts, and database migrations; runs on Bun |
| `apps/website` | `@auctionoton/website` | Next.js website |
| `packages/typescript-config` | `@auctionoton/typescript-config` | Shared TypeScript defaults, with app-specific options kept in each app |

Install dependencies from the repository root. `pnpm-lock.yaml` is the only lockfile; Bun runs the API but does not manage workspace dependencies.

```sh
pnpm --filter @auctionoton/website add some-package
pnpm --filter @auctionoton/server add -D some-tool
```

New apps belong in `apps/*`; shared code and configuration belong in `packages/*`. Give each package a unique `@auctionoton/` name and declare internal dependencies with `workspace:*`. Import shared code through package exports. TypeScript and Biome versions live in the catalog in `pnpm-workspace.yaml`.

## Commands

Run these from the repository root:

| Command | Result |
| --- | --- |
| `pnpm dev` | Start all apps |
| `pnpm build` | Build the website, API, and Chrome extension |
| `pnpm check` | Lint and typecheck every workspace |
| `pnpm typecheck` / `pnpm lint` | Run either check separately |
| `pnpm format` / `pnpm format:check` | Apply or check Biome formatting in each workspace |
| `pnpm build:firefox` | Build the Firefox extension |
| `pnpm zip` / `pnpm zip:firefox` | Produce browser store archives |
| `pnpm db:migrate` | Apply the API's database migrations; never cached |

The existing source has formatting differences and lint warnings; `format:check` reports them, and CI does not enforce repository-wide formatting.

Filter any Turbo task to one app, inspect the task graph, or check packages affected by a branch:

```sh
pnpm exec turbo run build --filter=@auctionoton/server
pnpm exec turbo run build --dry=json
pnpm exec turbo run typecheck --affected
```

Turbo caches build artifacts in `.turbo`. Each app's `turbo.json` lists its generated outputs and environment variables. Website tasks generate Panda CSS helpers and route types before they build or typecheck; the extension regenerates WXT types locally because they contain absolute checkout paths. Biome ignores generated code and database migration snapshots. Mutating commands, development servers, and migrations never use cached results.

Keep `.env` files inside the app that consumes them. Turbo hashes app environment files and declared build variables; it does not load environment files itself. When adding an environment variable, add it to the app's Turbo configuration too. See [Turbo's environment guide](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables).

## Build outputs and releases

The API writes `apps/server/build/`, Next.js writes `apps/website/.next/`, and WXT writes browser bundles in `apps/extension/.output/`.

```sh
pnpm cs:add
pnpm cs:ver
pnpm zip
pnpm zip:firefox
```

Upload `apps/extension/.output/auctionoton-chrome.zip` to Chrome or `auctionoton-firefox.zip` to Firefox. Firefox's `auctionoton-sources.zip` includes the repository's workspace manifests, lockfile, and shared configuration so reviewers can rebuild it. `pnpm zip:firefox` packages Chrome first to avoid concurrent WXT builds writing the same generated files. The legacy `pnpm e:version` command packages both browsers; it does not increment versions.

Changesets commands run at the root because they manage versions across the workspace. Build and check scripts live in their packages and run through Turbo.

## CI and deployment

CI uses the pinned Node, pnpm, and Bun versions, installs with a frozen lockfile, checks all workspaces, and builds all apps plus Firefox. It caches pnpm downloads and Turbo outputs through GitHub Actions; no remote cache account is required. The website build uses a nonfunctional Clerk publishable key solely to compile without production credentials.

The Chrome workflow packages and checks the extension on pushes to `main`, saves the ZIP as a workflow artifact, and uploads it using the existing Chrome Web Store secrets. Nixpacks installs dependencies at the workspace root and filters its build to the API. For a website deployment, install from the repository root and run `pnpm exec turbo run build --filter=@auctionoton/website` with the website's real environment variables.

Database migrations use `apps/server/src/db/drizzle`. Read [the database setup notes](apps/server/README.md) before applying them to an existing database.
