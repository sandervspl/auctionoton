**Cloudflare compatibility trial**

This stack deploys the existing TanStack website and a new native Worker backend to staging. It provisions two D1 databases, an R2 bucket, two Queues, two Workflows, and a SQLite Durable Object for TSM credentials and throttling. Alchemy keeps its own deployment state in a Cloudflare Worker and Durable Object, with credentials in Secrets Store.

The trial imports **Wild Growth EU Alliance, auction house 509**, using the seasonal TSM credential. The agreed future schedule is daily at `0 4 * * *` UTC. Automatic scheduling is disabled in both the stack and handler during the trial.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test:cloudflare
pnpm cf:deploy
pnpm cf:plan
node packages/infrastructure/scripts/verify-staging.mjs \
  https://auctionoton-staging-backend.sandervispoel.workers.dev \
  https://auctionoton-staging-website.sandervispoel.workers.dev
```

Copy [.env.example](.env.example) to `.env.local` and supply its values before deploying. Access applications and reusable policies belong to the sibling `cloudflare-infra` Terraform repository; configure this stack with its issuer and the **staging** audience output. Local commands can read TSM credentials from `apps/server/.env`, Access configuration from `apps/website/.env.local`, and an unexpired Wrangler OAuth grant from `~/.wrangler/config/default.toml`. Run `pnpm --filter @auctionoton/infrastructure exec wrangler whoami` to refresh/check that login. Environment values take precedence. The runner copies only the listed keys and never logs credential values. Workers Builds must supply its own API token; it does not read a developer's login.

The first `cf:deploy` bootstraps the remote state store. `cf:plan` requires that store to exist; Alchemy's plan command cannot bootstrap it non-interactively. D1 and R2 use retained removal policies. Alchemy alone applies the SQL migration directories; do not also run Wrangler migrations against these databases. The stack refuses production stages. Deployments for a stage must run serially.

The verifier creates an invited test account in the staging users database, signs in and out, starts one daily discovery, checks the resulting import and item price, and sends a duplicate import. It never sends email. Use only staging URLs. Trial accounts are disposable and must not be exported as production users.

**Workers Builds configuration**

Use one build owner for the entire stack: `auctionoton-staging-backend`. The website must not run a separate stack deployment. Connect repository `sandervspl/auctionoton` and the intended staging branch after the reviewed files are pushed.

| Setting | Value |
| --- | --- |
| Root directory | Repository root (`/`) |
| Node version | `24.21.0`, matching `.node-version` |
| Package manager | `pnpm@10.7.1`, frozen lockfile |
| Build command | `pnpm check` |
| Deploy command | `pnpm cf:deploy` |
| Non-production branch deployment | Disabled for this shared staging stack |
| Build variables/secrets | All keys in `.env.example`; mark credential values as secrets |

`cf:deploy` runs website code generation, Workers integration tests, and backend type checks before Alchemy. The deployment token needs the resource permissions for Workers, D1, R2, Queues/Workflows, Durable Objects, and Secrets Store. Configuring the build trigger separately requires **Workers CI Write**. The saved Wrangler grant returned HTTP 403 on Workers Builds during this trial, so the Git connection and first hosted build still need that access. [Cloudflare build-trigger API](https://developers.cloudflare.com/api/resources/workers_builds/subresources/triggers/methods/create/)

**Import recovery and limits**

Queue deliveries use a deterministic version/region/house/day Workflow ID. Repeated deliveries reuse that instance. An import archives raw bytes using 5 MiB multipart buffers, parses a flat JSON array incrementally, stores 500-row chunks in R2, and writes at most 96 SQL parameters per statement. Its publication pointer changes only after the stored row count matches the complete manifest. Older jobs cannot replace newer snapshots. Empty arrays are valid; malformed data, unsafe integers, wrong house IDs, and duplicate item variants cannot publish.

The private control routes require `Authorization: Bearer <CF_TRIAL_ADMIN_TOKEN>`:

| Route | Purpose |
| --- | --- |
| `POST /admin/daily` | Discover and enqueue today's configured house; repeated calls are safe |
| `POST /admin/import` | Enqueue a validated `{region, version, auctionHouseId, day}` job for the configured house |
| `GET /admin/status` | Last 30 snapshots, actual/expected rows, bytes, timestamps, failure details |
| `GET /admin/workflow/:id` | Inspect the durable import's status |
| `POST /admin/retry/:id` | Restart an errored import from its existing archive |

Terminal import errors persist in D1 and send a separate failure Queue message. Queue delivery failures also go to the failure queue. Provider 401 responses invalidate the relevant cached token. A provider's `Retry-After` sets a persistent cooldown, and Workflow retries wait for that cooldown. Provider credentials have separate cache identities. Tests cover tokens and cooldown surviving Durable Object eviction.

The trial caps a decoded raw snapshot at 64 MiB and an individual row at 64 KiB. Interrupted multipart uploads are aborted; R2 also removes orphan uploads after a day. A malformed HTTP 200 payload remains archived for diagnosis: restarting intentionally replays those same bytes. A controlled replacement-archive recovery path is still required before full ingestion rollout; do not delete only the raw object and leave old partial D1 rows or chunks behind.

The deployed staging website now uses Cloudflare Access; its deployment status and Google/permanent-password integration are recorded in the [Access migration notes](../../docs/cloudflare-access.md). The staging website deliberately has no working PostgreSQL connection. The trial API returns the existing price response structure with placeholder item names; metadata, media, realms, full API parity, user import, search, dashboards, cleanup, analytics, email, releases, and production cutover are separate migration work. The backend's isolated Better Auth proof is not used by the website. Do not redirect production traffic to this trial.

See the [migration assessment](../../docs/cloudflare-migration.md) for the full inventory and acceptance gates, and [read-only PostgreSQL sizing SQL](../../docs/sql/postgres-sizing.sql) for the production measurements still needed.
