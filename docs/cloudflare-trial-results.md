**Cloudflare trial results — 13 September 2026**

Alchemy is a workable fit for the project's Cloudflare resource graph with the pinned dependency set. The live trial passed the Worker runtime, storage, authentication, and durable ingestion checks. The hosted Workers Builds run and production sizing remain open gates.

| Check | Observed result |
| --- | --- |
| Existing TanStack website | [Staging website](https://auctionoton-staging-website.sandervispoel.workers.dev) returns server-rendered HTML, CSS/JS assets, health, and private/no-store page headers |
| Native Worker API | [Staging backend health](https://auctionoton-staging-backend.sandervispoel.workers.dev/health) returns `OK`; protected control/session routes reject anonymous requests |
| D1 authentication | Invited account creation, email/password sign-in, authenticated session read, sign-out, and subsequent cookie rejection passed on the deployed Worker |
| Live ingestion | TSM catalog discovery → Queue → AuctionImport Workflow → R2 raw/chunks → atomic D1 publication completed |
| Sample market | Wild Growth, EU, Alliance; seasonal auction house 509 |
| Snapshot ID | `seasonal-eu-509-2026-09-13` |
| Price rows / distinct item variants | 4,299 / 4,299 |
| Raw archived JSON | 609,757 bytes, about 595.5 KiB |
| Fetch observation | `2026-09-13T14:46:39.824Z` |
| Publication | `2026-09-13T14:46:53.878Z`; 14.054 seconds after observation |
| Market D1 database | 274,432 bytes (268 KiB), including schema, indexes, and migration bookkeeping |
| Users D1 database | 81,920 bytes (80 KiB), measured after the first test account |
| API reconciliation | Linen Cloth, item 2589: 98 copper minimum buyout, 779 quantity, 18 auctions; response matches the archived provider row |
| Duplicate daily/import calls | Succeeded without extra rows or a newer observation timestamp |
| Alchemy repeat plan | `Plan: no changes`; existing resource IDs retained |
| Automatic schedule | Disabled; intended daily UTC cron is `0 4 * * *` |

The downloaded raw archive's SHA-256 is `4a4efada84273cb253be2625008dde7f87f9c2f40306c00eede179b5de0d87da`. The archive is in R2 at `raw/seasonal-eu-509-2026-09-13.json`; raw provider data and credentials are not committed to the repository.

This one market would add approximately 4,299 rows per day if its item count remains similar. It does not establish the whole project's growth, largest payload, partition count, or production bill. The existing PostgreSQL connection refused connections; [read-only inventory SQL](sql/postgres-sizing.sql) is ready for a reachable production connection. The current production cron's hosting location and actual frequency remain unverified; the repository has only the Bun ingestion script.

The archived TSM catalog contains **194 distinct region/version/auction-house combinations** for the four versions currently supported by the project. Only 86 have a nonzero provider modification timestamp in that response; zero alone is not evidence that a house should be dropped from the migration.

| Provider version | US houses | EU houses | Nonzero modification timestamp, both regions |
| --- | ---: | ---: | ---: |
| Classic Era | 24 | 34 | 0 |
| Wrath (`classic` in the app) | 46 | 50 | 65 |
| Classic Era - Hardcore | 6 | 6 | 12 |
| Season of Discovery | 16 | 12 | 9 |

The pricing response did not provide a usable `Last-Modified` header. Before production, propagate each house's catalog modification time into ingestion records and freshness checks; the trial API reports the successful fetch observation time.

**Compatibility fixes made during the trial**

- Alchemy `2.0.0-beta.77` crashed with Effect `4.0.0-rc.115` because `Config.string` was removed. Pinning Effect and the relevant Effect packages to `4.0.0-rc.112` restored CLI and deployment compatibility. Keep these versions together until a tested upgrade.
- The Alchemy Vite resource successfully builds the existing TanStack/Vite 8 application when the Nitro Node adapter is omitted. It supplies its own Cloudflare Vite integration.
- Explicit Vite input globs exclude generated Panda/router files and include the shared TypeScript configuration and workspace lockfile. This removed unnecessary rebuilds and produced a clean repeat plan.
- A code review reproduced R2 rejecting unknown-length and gzip HTTP response streams. The ingestion worker now uses 5 MiB multipart buffers, enforces its decoded-byte limit while streaming, completes only after EOF, and aborts interrupted uploads. R2 lifecycle cleanup covers abandoned multipart uploads.
- Provider credentials have separate persistent token entries. Token invalidation handles HTTP 401; persistent cooldown and dynamic Workflow retry delay respect HTTP 429 `Retry-After` values, including hour-long waits.

**Validation and outstanding gates**

All **14 Workers integration tests** pass, along with all 13 workspace lint/type-check tasks, application builds, and the five existing website smoke tests.

Workers integration checks run inside workerd with real emulated D1, R2, Durable Objects, and Workflows. They cover incomplete publication, duplicate chunks, old-job ordering, empty snapshots, pet variants, malformed/unsafe data, a retried Workflow step, unknown-length/interrupted uploads, token and cooldown persistence across eviction, 401/429 behavior, D1 sessions, operator access, and disabled/enabled scheduled-handler behavior. The existing workspace checks, application builds, and five Node website smoke checks also pass.

The live verifier is committed at [verify-staging.mjs](../packages/infrastructure/scripts/verify-staging.mjs). It passed against the deployed services, including a second run that reused the already-complete snapshot.

Workers Builds API access returned HTTP 403 with the saved Wrangler OAuth grant. The build owner, commands, environment requirements, and Git connection settings are prepared in the [runbook](../packages/infrastructure/README.md). Completing that gate requires **Workers CI Write** access and the reviewed source on the connected branch. It has not run in Workers Builds yet.

Before expanding beyond the trial: measure all active houses and the largest payload, inventory the PostgreSQL data and existing scheduler, implement controlled replacement of rejected archives, migrate the full API/schema/query/auth surface, move metadata/media/retention jobs, and implement daily reconciliation and alerts. The deployed staging website now uses Cloudflare Access, with Google plus a permanent-password OIDC Worker/D1 service managed in `cloudflare-infra`. The live password → Access → website login has passed. The website has no working PostgreSQL connection; [user migration and production cutover gates](cloudflare-access.md) remain open. Database-backed routes are not migrated. The trial backend uses placeholder item metadata. Production DNS, traffic, data, and the old scheduler have not been cut over.
