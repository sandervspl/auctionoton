import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: './src/index.ts',
      miniflare: {
        compatibilityDate: '2026-09-13',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: ['MARKET', 'USERS'],
        r2Buckets: ['SNAPSHOTS'],
        durableObjects: { PROVIDER: { className: 'ProviderCoordinator', useSQLite: true } },
        queueProducers: { AUCTION_JOBS: 'test-auctions', FAILED_JOBS: 'test-failures' },
        workflows: {
          AUCTION_IMPORT: { name: 'test-import', className: 'AuctionImport' },
          DAILY_DISCOVERY: { name: 'test-discovery', className: 'DailyDiscovery' },
        },
        bindings: {
          MARKET_MIGRATIONS: await readD1Migrations('./migrations/market'),
          AUTH_MIGRATIONS: await readD1Migrations('./migrations/auth'),
          BASE_URL: 'https://trial.example.com',
          ADMIN_TOKEN: 'test-admin-secret',
          BETTER_AUTH_SECRET: 'test-only-secret-with-at-least-thirty-two-characters',
          TSM_CLIENT_ID: 'test-client',
          TSM_API_KEY: 'test-seasonal-key',
          TSM_API_KEY_B: 'test-classic-key',
          TSM_API_KEY_C: 'test-hardcore-key',
          TSM_API_KEY_D: 'test-era-key',
          TRIAL_HOUSE_ID: '509',
          TRIAL_REGION: 'eu',
          TRIAL_VERSION: 'seasonal',
          DAILY_ENABLED: 'false',
        },
      },
    }),
  ],
  test: { setupFiles: ['./tests/setup.ts'], testTimeout: 30_000 },
});
