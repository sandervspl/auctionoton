import dotenv from 'dotenv';
import type { Config } from 'drizzle-kit';

dotenv.config({
  path: '.env.local',
});

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: process.env.DB_DRIVER as any,
  dbCredentials: {
    url: process.env.DB_URL!,
    // @ts-ignore
    authToken: process.env.DB_AUTH_TOKEN!,
  },
} satisfies Config;
