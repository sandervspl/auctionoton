# Combined PostgreSQL migration history

This is the unchanged combined history formerly owned by the retired Bun API. It includes the website tables and indexes, the numeric auction-price migration in `0016_funny_scorpion`, and `pg_trgm` for item search.

For a fresh PostgreSQL database, set `DB_URL` in `apps/website/.env.local` and run `pnpm db:migrate` from the repository root. The command uses Node and closes the connection on success or failure. It does not touch Cloudflare D1; Alchemy owns those migrations.

Existing databases from either original branch need schema reconciliation before applying this combined history. The older website-only history in `src/db/drizzle` is retained separately and is not used by this command. Do not concatenate or replay the two histories.
