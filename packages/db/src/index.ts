import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

import * as schema from './schema';

const PROCESS_DB_URL = process.env.DB_URL!;
const DB_URL = PROCESS_DB_URL.startsWith('https') ? PROCESS_DB_URL : `file:${PROCESS_DB_URL}`;

const client = createClient({
  url: DB_URL,
  authToken: process.env.DB_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
