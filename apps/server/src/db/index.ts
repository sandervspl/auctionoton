import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
// import { migrate } from 'drizzle-orm/libsql/migrator';

import * as schema from './schema';

const client = createClient({ url: 'file:sqlite.db' });

export const db = drizzle(client, { schema });

// migrate(db, { migrationsFolder: 'src/db/drizzle' });
