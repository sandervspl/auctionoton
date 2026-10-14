import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { beforeAll } from 'vitest';
import type { Env as BackendEnv } from '../src/env';

declare global {
  namespace Cloudflare {
    interface GlobalProps {
      mainModule: typeof import('../src/index');
    }
    interface Env extends BackendEnv {
      MIGRATION_TEST: D1Database;
      MARKET_MIGRATIONS: Parameters<typeof applyD1Migrations>[1];
      AUTH_MIGRATIONS: Parameters<typeof applyD1Migrations>[1];
    }
  }
}
beforeAll(async () => {
  await applyD1Migrations(env.MARKET, env.MARKET_MIGRATIONS);
  await applyD1Migrations(env.USERS, env.AUTH_MIGRATIONS);
});
