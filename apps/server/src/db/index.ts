import { drizzle } from 'drizzle-orm/postgres-js';
// import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import * as schema from './schema';

// const migrationClient = postgres(process.env.DB_URL!, { max: 1 });
// migrate(drizzle(migrationClient), { migrationsFolder: './src/db/migrations' });

const postgresClient = postgres(process.env.DB_URL!, {
  idle_timeout: 1000,
  onclose(connId) {
    console.log(`DB connection "${connId}" closed`);
  },
  onnotice(notice) {
    console.log('DB notice:', notice);
  },
});
export const db = drizzle(postgresClient, { schema });

export async function closeDbConnection() {
  try {
    await postgresClient.end();
  } catch (error) {
    console.error('Failed to close DB connection:', error);
  }
}
