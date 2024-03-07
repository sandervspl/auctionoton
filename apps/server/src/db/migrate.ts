import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// This will run migrations on the database, skipping the ones already applied
const migrationClient = postgres(process.env.DB_URL!, { max: 1 });
await migrate(drizzle(migrationClient), { migrationsFolder: 'src/db/drizzle' });

// Don't forget to close the connection, otherwise the script will hang
await migrationClient.end();
