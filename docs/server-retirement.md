# Server retirement — 14 September 2026

`apps/server` can be deleted for the current staging setup. The extension uses the Cloudflare backend; the website uses server functions with D1 on Cloudflare or its own PostgreSQL client on Node. Neither imports the Bun server. Its former production URL returns `DEPLOYMENT_NOT_FOUND`, and no tracked scheduler invokes its ingestion scripts.

The remaining file dependencies were relocated before deletion:

| Responsibility | Current owner |
| --- | --- |
| Health, realms, and item API | `apps/cloudflare/src/index.ts` |
| Auction discovery/import, credentials, retention | Cloudflare Workflows, Queues, Durable Objects, D1, and R2 |
| Blizzard item and media import | `packages/infrastructure/scripts/import-item-catalog.mjs` |
| Local TSM and Blizzard credentials | Ignored `packages/infrastructure/.env.local` |
| Combined PostgreSQL migration history | `apps/website/migrations/postgres`, applied by `pnpm db:migrate` using Node |

The local server environment was backed up privately before moving the credentials needed by infrastructure. No secrets were committed. The Bun-only Nixpacks deployment, workspace commands, dependencies, and CI installation were removed. The original source remains in Git history at `f339bb3`.

This retires an unused executable; it does not complete the production migration. Staging still imports only its configured trial market, automatic auction discovery is disabled, the old pricing credentials are rejected by TSM, and legacy production data reconciliation remains outstanding. Realm discovery uses the working primary credential, which returns the full catalog. No database migration, production cutover, scheduler change, or expansion of imported markets was performed during removal.
