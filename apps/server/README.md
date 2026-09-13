# Auctionoton API

The Elysia API runs on Bun 1.3.14 or newer. Install workspace dependencies with pnpm at the repository root:

```sh
pnpm install --frozen-lockfile
cp apps/server/.env.example apps/server/.env
```

Set `DB_URL` and `REDIS_URL` to your development PostgreSQL and Redis instances. Fill in Blizzard and TradeSkillMaster credentials for ingestion scripts. Start the API with `pnpm dev:server`; its health endpoint is `http://localhost:3000/health`.

Build with `pnpm exec turbo run build --filter=@auctionoton/server`, then run `pnpm --filter @auctionoton/server start`. The website runs separately on port 3001 during development.

## Database migrations

The combined `main`, `wxt`, and `website` migration history targets a fresh development database.
It includes the website tables and indexes, followed by the numeric auction price change from
`main` in `0016_funny_scorpion`. The final migration also enables `pg_trgm` for item search.

After setting `DB_URL` to a new database, run `pnpm --filter @auctionoton/server db:migrate`
from the repository root. The server migration directory is the source of the combined schema.

Existing databases migrated on either original branch need separate reconciliation before
using this history; the merged journal does not upgrade both historical database states.
