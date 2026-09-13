# Elysia with Bun runtime

## Getting Started
To get started with this template, simply paste this command into your terminal:
```bash
bun create elysia ./elysia-example
```

## Development
To start the development server run:
```bash
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.

## Database migrations

The combined `main`, `wxt`, and `website` migration history targets a fresh development database.
It includes the website tables and indexes, followed by the numeric auction price change from
`main` in `0016_funny_scorpion`. The final migration also enables `pg_trgm` for item search.

After setting `DB_URL` to a new database, run `pnpm --filter @auctionoton/server db:migrate`
from the repository root. The server migration directory is the source of the combined schema.

Existing databases migrated on either original branch need separate reconciliation before
using this history; the merged journal does not upgrade both historical database states.
