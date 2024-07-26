import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

// const queryClient = postgres(process.env.DB_URL!);
// export const db = drizzle(queryClient, { schema });

let db: ReturnType<typeof drizzle>;

if (process.env.NODE_ENV === 'production') {
  const queryClient = postgres(process.env.DB_URL!);
  db = drizzle(queryClient, { schema });
} else {
  const queryClient = postgres(process.env.DB_URL!);
  if (!global.db) {
    global.db = drizzle(queryClient, { schema });
  }

  db = global.db;
}

export { db };
