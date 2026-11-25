# Auctionoton

Auction House prices for World of Warcraft, with a Wowhead browser extension, a website, and a Cloudflare Worker API. This repository uses pnpm workspaces and Turborepo.

Download the extension for [Chrome, Brave, Edge, and Opera](https://chrome.google.com/webstore/detail/auctionoton-auction-house/ffflgkmjodhdladikaglbeofemhbojio) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/auctionoton/).

## Get started

Use Node.js 22.12 or newer (`.node-version` pins the development and CI version), pnpm 10.7.1.

```sh
npm install --global pnpm@10.7.1
pnpm install --frozen-lockfile
pnpm dev:extension
```

WXT generates its TypeScript configuration during installation. It opens a browser with the development extension loaded. For Firefox, run `pnpm --filter @auctionoton/extension dev:firefox`.

For the local Node website, copy its environment example and fill in its credentials:

```sh
cp apps/website/.env.example apps/website/.env.local
pnpm dev
```

The extension uses the deployed Cloudflare staging API in both development and production builds. Port 3000 belongs to WXT, not a standalone API. The website uses `http://localhost:3001`; its local Node data routes use PostgreSQL while the staging website uses D1. Authentication verifies Cloudflare Access sessions. Local public pages work without a login provider, while interactive sign-in needs a configured Access hostname. Use `pnpm dev:website` for the website alone and `pnpm cf:dev` for the local Cloudflare stack.

## Workspace

| Directory | Package | Purpose |
| --- | --- | --- |
| `apps/extension` | `@auctionoton/extension` | WXT extension for Chrome and Firefox |
| `apps/website` | `@auctionoton/website` | TanStack Start website |
| `apps/cloudflare` | `@auctionoton/cloudflare` | Staging Worker API, D1 auth, and durable auction ingestion |
| `packages/infrastructure` | `@auctionoton/infrastructure` | Alchemy stack and Cloudflare deployment tools |
| `packages/typescript-config` | `@auctionoton/typescript-config` | Shared TypeScript defaults, with app-specific options kept in each app |

Install dependencies from the repository root. `pnpm-lock.yaml` is the only lockfile; Node runs the local build and development tools.

```sh
pnpm --filter @auctionoton/website add some-package
pnpm --filter @auctionoton/extension add -D some-tool
```

New apps belong in `apps/*`; shared code and configuration belong in `packages/*`. Give each package a unique `@auctionoton/` name and declare internal dependencies with `workspace:*`. Import shared code through package exports. TypeScript and Biome versions live in the catalog in `pnpm-workspace.yaml`.

## Commands

Run these from the repository root:

| Command | Result |
| --- | --- |
| `pnpm dev` | Start all apps |
| `pnpm build` | Build the website and Chrome extension |
| `pnpm check` | Lint and typecheck every workspace |
| `pnpm typecheck` / `pnpm lint` | Run either check separately |
| `pnpm format` / `pnpm format:check` | Apply or check Biome formatting in each workspace |
| `pnpm build:firefox` | Build the Firefox extension |
| `pnpm zip` / `pnpm zip:firefox` | Produce browser store archives |
| `pnpm db:migrate` | Apply the website's combined PostgreSQL migrations; never cached |

The existing source has formatting differences and lint warnings; `format:check` reports them, and CI does not enforce repository-wide formatting.

Filter any Turbo task to one app, inspect the task graph, or check packages affected by a branch:

```sh
pnpm exec turbo run build --filter=@auctionoton/extension
pnpm exec turbo run build --dry=json
pnpm exec turbo run typecheck --affected
```

Turbo caches build artifacts in `.turbo`. Each app's `turbo.json` lists its generated outputs and environment variables. Website tasks generate Panda CSS helpers and route types before they build or typecheck; the extension regenerates WXT types locally because they contain absolute checkout paths. Biome ignores generated code and database migration snapshots. Mutating commands, development servers, and migrations never use cached results.

Keep `.env` files inside the app that consumes them. Turbo hashes app environment files and declared build variables; it does not load environment files itself. When adding an environment variable, add it to the app's Turbo configuration too. See [Turbo's environment guide](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables).

## Build outputs and releases

TanStack Start writes `apps/website/.output/`, and WXT writes browser bundles in `apps/extension/.output/`.

```sh
pnpm cs:add
pnpm cs:ver
pnpm zip
pnpm zip:firefox
```

Upload `apps/extension/.output/auctionoton-chrome.zip` to Chrome or `auctionoton-firefox.zip` to Firefox. Firefox's `auctionoton-sources.zip` includes the repository's workspace manifests, lockfile, and shared configuration so reviewers can rebuild it. `pnpm zip:firefox` packages Chrome first to avoid concurrent WXT builds writing the same generated files. The legacy `pnpm e:version` command packages both browsers; it does not increment versions.

Changesets commands run at the root because they manage versions across the workspace. Build and check scripts live in their packages and run through Turbo.

## CI and deployment

`pnpm exec turbo run test:smoke --filter=@auctionoton/website` builds and tests the production website with locally signed test tokens. It checks SSR, static assets, Access sessions, login redirects, sign-out, anonymous rejection, 404s, and SEO endpoints without accessing a database. `pnpm --filter @auctionoton/website test:auth` checks JWT verification and owner mapping independently.

CI uses the pinned Node and pnpm versions, installs with a frozen lockfile, checks all workspaces, and builds all apps plus Firefox. It caches pnpm downloads and Turbo outputs through GitHub Actions; no remote cache account is required. Website compilation and authentication tests need no production credentials.

The Chrome workflow packages and checks the extension on pushes to `main`, saves the ZIP as a workflow artifact, and uploads it using the existing Chrome Web Store secrets. The Worker API and staging website deploy together with `pnpm cf:deploy`; see the infrastructure runbook. For a website deployment, install from the repository root and run `pnpm exec turbo run build --filter=@auctionoton/website` with the website's real environment variables. Start the production server with `pnpm --filter @auctionoton/website start`; set `PORT=3001` when running it alongside the API. The server also loads the website's `.env` and `.env.local` files.

The website uses [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview), file routes in `apps/website/src/routes`, Vite, and [Nitro's Node server output](https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nodejs--docker). Route loaders call validated server functions for database access; dashboard mutations check the verified Access identity and record ownership. Keep `DB_URL` and Access configuration server-side. The [Access migration notes](docs/cloudflare-access.md) cover infrastructure ownership, sign-in setup, legacy user IDs, and the remaining deployment gates.

`/api/health`, `/robots.txt`, and `/sitemap.xml` are server routes. The sitemap includes the public homepage; private dashboards are excluded. `APP_ENV` chooses `TEST_SITE_URL`, `ACC_SITE_URL`, or `PROD_SITE_URL` for the sitemap's public origin.

The retired `apps/server` workspace has been removed. Its combined PostgreSQL migration history now lives in `apps/website/migrations/postgres`; read [the migration notes](apps/website/migrations/postgres/README.md) before applying it to an existing database. Cloudflare D1 migrations remain owned by Alchemy. See [the server retirement assessment](docs/server-retirement.md).

The [Cloudflare migration assessment](docs/cloudflare-migration.md) evaluates Alchemy and maps the work to move hosting, storage, authentication, builds, and all background jobs to Cloudflare, starting with one auction-data refresh per day.

The [staging trial runbook](packages/infrastructure/README.md) covers the deployed Workers, daily import verification, and the remaining migration gates.
