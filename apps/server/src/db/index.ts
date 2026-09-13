import { drizzle } from 'drizzle-orm/postgres-js';
// import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import * as schema from './schema';

export function createDbClient() {
  const client = postgres(process.env.DB_URL!, {
    onclose(connId) {
      console.log(`DB connection "${connId}" closed`);
    },
    onnotice(notice) {
      console.log('DB notice:', notice);
    },
  });

  return { db: drizzle(client, { schema }), client };
}

export const { db } = createDbClient();
