**Cloudflare compatibility trial**

This stack deploys the existing TanStack website and a new native Worker backend to staging. It provisions two D1 databases, an R2 bucket, two Queues, three Workflows, and a SQLite Durable Object for TSM credentials and throttling. Alchemy keeps its own deployment state in a Cloudflare Worker and Durable Object, with credentials in Secrets Store.

The trial imports **Wild Growth EU Alliance, auction house 509**, using the seasonal TSM credential. The agreed future import schedule is daily at `0 4 * * *` UTC; automatic imports remain disabled in both the stack and handler. Storage maintenance runs independently at `30 4 * * *` UTC.

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

Copy [.env.example](.env.example) to `.env.local` and supply its values before deploying. Access applications and reusable policies belong to the sibling `cloudflare-infra` Terraform repository; configure this stack with its issuer and both **staging** audience outputs (`auctionoton_access_audiences` and `auctionoton_access_google_audiences`). Set the latter as `CLOUDFLARE_ACCESS_GOOGLE_AUD`. See [the coordinated rollout](../../docs/cloudflare-access.md#deployment-and-validation). Local commands can read TSM credentials from `apps/server/.env`, Access configuration from `apps/website/.env.local`, and an unexpired Wrangler OAuth grant from `~/.wrangler/config/default.toml`. Run `pnpm --filter @auctionoton/infrastructure exec wrangler whoami` to refresh/check that login. Environment values take precedence. The runner copies only the listed keys and never logs credential values. Workers Builds must supply its own API token; it does not read a developer's login.

The first `cf:deploy` bootstraps the remote state store. `cf:plan` requires that store to exist; Alchemy's plan command cannot bootstrap it non-interactively. D1 and R2 use retained removal policies. Alchemy alone applies the SQL migration directories; do not also run Wrangler migrations against these databases. D1 resource names must be resolved before registration: the pinned Alchemy version skips migration-file detection when props still contain an Effect. Confirm `Market update` in the plan when adding market migrations. The stack refuses production stages. Deployments for a stage must run serially.

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

`cf:deploy` runs website code generation, Workers integration tests, type checks, authentication tests, and the built website’s D1 smoke tests before Alchemy. The deployment token needs the resource permissions for Workers, D1, R2, Queues/Workflows, Durable Objects, and Secrets Store. Configuring the build trigger separately requires **Workers CI Write**. The saved Wrangler grant returned HTTP 403 on Workers Builds during this trial, so the Git connection and first hosted build still need that access. [Cloudflare build-trigger API](https://developers.cloudflare.com/api/resources/workers_builds/subresources/triggers/methods/create/)

**Import recovery and limits**

Queue deliveries use a deterministic version/region/house/day Workflow ID. Repeated deliveries reuse that instance. An import archives raw bytes using 5 MiB multipart buffers, parses a flat JSON array incrementally, stores 500-row chunks in R2, and writes at most 96 SQL parameters per statement. Its publication pointer changes only after the stored row count matches the complete manifest. Older jobs cannot replace newer snapshots. Empty arrays are valid; malformed data, unsafe integers, wrong house IDs, and duplicate item variants cannot publish.

The private control routes require `Authorization: Bearer <CF_TRIAL_ADMIN_TOKEN>`:

| Route | Purpose |
| --- | --- |
| `POST /admin/daily` | Discover and enqueue today's configured houses; repeated calls are safe |
| `POST /admin/import` | Enqueue a validated `{region, version, auctionHouseId, day}` job for an enabled house |
| `POST /admin/maintenance` | Run today's bounded D1/R2 cleanup; repeated calls reuse the instance |
| `GET /admin/status` | Last 30 snapshots, actual/expected rows, bytes, timestamps, failure details |
| `GET /admin/workflow/:id` | Inspect the durable import's status |
| `POST /admin/retry/:id` | Restart an errored import from its existing archive |

Terminal import errors persist in D1 and send a separate failure Queue message. Queue delivery failures also go to the failure queue. Provider 401 responses invalidate the relevant cached token. A provider's `Retry-After` sets a persistent cooldown, and Workflow retries wait for that cooldown. Provider credentials have separate cache identities. Tests cover tokens and cooldown surviving Durable Object eviction.

The trial caps a decoded raw snapshot at 64 MiB and an individual row at 64 KiB. Interrupted multipart uploads are aborted; R2 also removes orphan uploads after a day. A malformed HTTP 200 payload remains archived for diagnosis: restarting intentionally replays those same bytes. A controlled replacement-archive recovery path is still required before full ingestion rollout; do not delete only the raw object and leave old partial D1 rows or chunks behind.

Market snapshots use integer database IDs while Workflow IDs and R2 keys retain the readable version/region/house/day key. Maintenance removes completed, unpublished price snapshots older than 30 days in batches of 1,000 rows. It keeps each house's published snapshot even when stale, removes completed normalized chunks after seven days, and removes eligible raw archives and snapshot metadata after 35 days. Active and failed imports remain available for recovery and require operator reconciliation. New imports outside the retention window are rejected so deleted archive keys cannot be recreated during cleanup; existing imports can resume. Migration backups under `migration-backups/` are retained.

`ENABLED_HOUSES` accepts a JSON array of `{version, region, auctionHouseId}` objects, up to 250 entries. Empty uses the existing trial selection. Discovery validates the allowlist against the provider catalog, deduplicates shared realm markets, records provider modification timestamps, and batches Queue dispatch. Add markets only after representative sizing and provider/Cloudflare capacity checks. Catalog metadata currently covers Classic Era/Season of Discovery in `en_US`; catalog identity must be scoped before importing other namespaces or locales.

The deployed staging website now uses Cloudflare Access; its deployment status and Google/permanent-password integration are recorded in the [Access migration notes](../../docs/cloudflare-access.md). The staging website uses its MARKET and USERS D1 bindings for item search, item detail/history, recent searches, and dashboard collections. The Node deployment retains its PostgreSQL path. The trial API returns real catalog names and icons with its existing price response structure; full API parity, legacy user-data import, failed-job reconciliation, analytics, email, releases, and production cutover remain separate migration work. The backend's isolated Better Auth proof is not used by the website. Do not redirect production traffic to this trial.

See the [migration assessment](../../docs/cloudflare-migration.md) for the full inventory and acceptance gates, and [read-only PostgreSQL sizing SQL](../../docs/sql/postgres-sizing.sql) for the production measurements still needed.

## Website data and item catalog

After deploying the market migrations, populate real item names and icons with:

```sh
node packages/infrastructure/scripts/import-item-catalog.mjs
```

This staging-only command uses `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` from the environment or `apps/server/.env`, downloads Blizzard’s Classic Era/Season of Discovery item and media catalogs with ID pagination, and upserts item metadata through Wrangler. Icons are stored as short asset names and expanded to Blizzard image URLs by the shared adapter. Missing media are checked individually; items with no provider asset use the fallback. Unchanged rows are skipped on repeat runs. Wrangler must already be authenticated. No player records or price snapshots are deleted. Alchemy owns schema migrations; do not apply them separately with Wrangler.

Use `--output /tmp/auctionoton-catalog.sql` to download and prepare the data import without changing staging. Keep generated SQL and provider exports outside the repository. On 14 September 2026, Blizzard supplied icons for 22,839 of 22,842 catalog items; the three exceptions were unused monster bottle items 2716, 2717, and 2718.

Access session verification and owner-ID mappings apply before every private D1 operation. Recent searches are unique per owner/item and retain the latest ten. Dashboard items belong directly to their collection with cascading deletion and server-computed ordering. Item pages show complete seasonal snapshots for the selected region and auction house within seven days; absent prices display an empty state. Existing PostgreSQL collections and search history have not been imported because that database refuses connections. The trial still publishes only Wild Growth EU Alliance, and its daily cron remains disabled.

Validation includes workerd/D1 repository tests plus the actual production website bundle with isolated D1 bindings and signed Access fixtures. The latter exercises public search, item pages, signed-in home with an auction-house cookie, repeat searches, collection CRUD, and owner isolation. A generic health response alone does not verify data access.

The extension now targets staging with the public `GET /realms/:region/:version` endpoint (`eu`/`us`; `classic`/`era`/`hardcore`/`seasonal`). It reads the full live TSM realm catalog using the primary credential (independent of secondary pricing credentials), validates it, and caches it in R2 for one hour independently of auction imports. The popup rechecks every five minutes while open and offers manual refresh; an upstream fetch happens after the server cache expires. Catalog errors return HTTP 503 with no-store instead of an empty success. Progression Classic accepts Mists of Pandaria, Cataclysm, and the provider's legacy Wrath label in that order; unknown labels fail visibly. Blizzard realm changes appear once the pricing provider publishes the corresponding auction-house mappings. This is not a direct Blizzard realm sync, and new game modes still require an explicit mapping.

Realm availability does not imply price coverage: staging still only imports the configured trial market. The extension's realm and item requests both use staging until a production cutover is ready. Load the rebuilt extension from `apps/extension/.output/chrome-mv3` (or `firefox-mv3`) to use this change; installed store versions are unaffected.
