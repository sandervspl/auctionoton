import { defineConfig } from 'drizzle-kit';

console.log(
  'drizzle.config.ts',
  process.env.DB_URL,
  process.env.DB_HOST,
  process.env.DB_NAME,
  process.env.DB_PORT,
);

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DB_URL!,
    host: process.env.DB_HOST!,
    database: process.env.DB_NAME!,
    port: Number(process.env.DB_PORT!),
  },
  verbose: true,
  strict: true,
});
