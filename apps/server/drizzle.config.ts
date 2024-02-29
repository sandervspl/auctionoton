import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DB_URL!,
    database: 'postgres',
  },
  verbose: true,
  strict: true,
});
