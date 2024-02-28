import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/drizzle',
  driver: 'libsql',
  dbCredentials: {
    url: 'file:sqlite.db',
  },
  verbose: true,
  strict: true,
});
