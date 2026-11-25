import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

if (!process.env.DB_URL) throw new Error('DB_URL is required for PostgreSQL migrations');
const client = postgres(process.env.DB_URL, { max: 1 });
try {
  await migrate(drizzle(client), {
    migrationsFolder: fileURLToPath(new URL('../migrations/postgres/', import.meta.url)),
  });
} finally {
  await client.end();
}
