import * as Alchemy from 'alchemy';
import * as Cloudflare from 'alchemy/Cloudflare';
import * as RemovalPolicy from 'alchemy/RemovalPolicy';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import type { AuctionJob } from '../../apps/cloudflare/src/contracts';
import { MAINTENANCE_CRON } from '../../apps/cloudflare/src/retention';

// The existing Node build remains available during the compatibility trial.
process.env.AUCTIONOTON_CLOUDFLARE = '1';

// Set by scripts/cloudflare.mjs from its --stage argument; module-level config depends on it.
const stage = process.env.AUCTIONOTON_STAGE ?? 'staging';
const production = stage === 'production';
export const PRODUCTION_DOMAIN = 'auctionoton-api.sandervspl.dev';

// Plain strings: this Alchemy version sends unresolved Effect names to the Cloudflare API when it
// creates R2 buckets, Queues and Workers, which only showed up on a fresh stage.
const resourceName = (suffix: string) => `auctionoton-${stage}-${suffix}`;

// Props must not contain Effects: this Alchemy version skips its D1 migration-file diff
// when a prop is still an Effect at plan time.
const market = Cloudflare.D1.Database('Market', {
  name: resourceName('market'),
  primaryLocationHint: 'weur',
  migrations: { dir: '../../apps/cloudflare/migrations/market' },
}).pipe(RemovalPolicy.retain());
const users = Cloudflare.D1.Database('Users', {
  name: resourceName('users'),
  primaryLocationHint: 'weur',
  migrations: { dir: '../../apps/cloudflare/migrations/auth' },
}).pipe(RemovalPolicy.retain());
const snapshots = Cloudflare.R2.Bucket('Snapshots', {
  name: resourceName('snapshots'),
  lifecycleRules: [
    {
      id: 'abort-incomplete-uploads',
      enabled: true,
      abortMultipartUploadsTransition: { condition: { type: 'Age', maxAge: 86400 } },
    },
  ],
}).pipe(RemovalPolicy.retain());
const jobs = Cloudflare.Queues.Queue('AuctionJobs', { name: resourceName('auctions') });
const failures = Cloudflare.Queues.Queue('FailedJobs', { name: resourceName('failures') });

const observability = {
  enabled: true,
  logs: { enabled: true, invocationLogs: true, headSamplingRate: 1, persist: true },
  traces: { enabled: true, headSamplingRate: 1, persist: true },
};
export const DAILY_CRON = '0 4 * * *';

// Production imports daily; staging keeps imports manual.
const enabledHouses = production
  ? [{ version: 'forever', region: 'eu', auctionHouseId: 573 }] // Forever Normal Alliance
  : [
      { version: 'seasonal', region: 'eu', auctionHouseId: 509 }, // Wild Growth Alliance (trial)
      { version: 'forever', region: 'eu', auctionHouseId: 573 }, // Forever Normal Alliance
    ];

export const Backend = Cloudflare.Worker('Backend', {
  name: resourceName('backend'),
  cache: { enabled: true },
  main: '../../apps/cloudflare/src/index.ts',
  compatibility: { date: '2026-09-13', flags: ['nodejs_compat'] },
  observability,
  // The extension's host permission names this domain; changing it disables installed copies
  // until users re-approve the extension.
  ...(production ? { domain: PRODUCTION_DOMAIN } : {}),
  crons: production ? [DAILY_CRON, MAINTENANCE_CRON] : [MAINTENANCE_CRON],
  env: {
    MARKET: market,
    USERS: users,
    SNAPSHOTS: snapshots,
    AUCTION_JOBS: jobs,
    FAILED_JOBS: failures,
    AUCTION_IMPORT: Cloudflare.Workflow<AuctionJob>('AuctionImport'),
    DAILY_DISCOVERY: Cloudflare.Workflow<{ day: string }>('DailyDiscovery'),
    MARKET_MAINTENANCE: Cloudflare.Workflow<{ now: string }>('MarketMaintenance'),
    BASE_URL: Cloudflare.Worker.URL,
    ADMIN_TOKEN: Config.redacted('CF_TRIAL_ADMIN_TOKEN'),
    BETTER_AUTH_SECRET: Config.redacted('CF_TRIAL_AUTH_SECRET'),
    TRIAL_HOUSE_ID: Config.string('CF_TRIAL_HOUSE_ID'),
    TRIAL_REGION: 'eu',
    TRIAL_VERSION: 'seasonal',
    DAILY_ENABLED: (production ? 'true' : 'false') as string,
    // Replaces the trial-house default. Expand the allowlist after representative sizing.
    ENABLED_HOUSES: JSON.stringify(enabledHouses) as string,
  },
});
export type BackendEnv = Cloudflare.InferEnv<typeof Backend>;

export default Alchemy.Stack(
  'auctionoton',
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const stack = yield* Alchemy.Stack;
    if (!['staging', 'local', 'production'].includes(stack.stage)) {
      throw new Error('Supported stages are local, staging and production.');
    }
    if (stack.stage !== stage) {
      throw new Error('Run production deploys through scripts/cloudflare.mjs so config matches.');
    }
    const backend = yield* Backend;
    const queue = yield* jobs;
    const deadLetters = yield* failures;
    yield* Cloudflare.Queues.Consumer('AuctionConsumer', {
      queueId: queue.queueId,
      scriptName: backend.workerName,
      deadLetterQueue: deadLetters.queueName,
      settings: { batchSize: 1, maxConcurrency: 1, maxRetries: 5, retryDelay: 30 },
    });
    // Production serves only the extension API; the website stays on staging for now.
    if (production) {
      return { backend: backend.url, dailyCron: DAILY_CRON, cronEnabled: true };
    }
    const website = yield* Cloudflare.Website.Vite('Website', {
      name: resourceName('website'),
      rootDir: '../../apps/website',
      memo: {
        include: [
          'src/**',
          'public/**',
          '*.ts',
          '*.json',
          '../../packages/typescript-config/**',
          '../../apps/cloudflare/src/website-data.ts',
          '../../apps/cloudflare/src/item-icons.ts',
        ],
        exclude: ['src/styled-system/**', 'src/routeTree.gen.ts', '**/node_modules/**'],
        lockfile: true,
      },
      compatibility: { date: '2026-09-13', flags: ['nodejs_compat'] },
      observability,
      env: {
        TRIAL_BACKEND: backend,
        MARKET: market,
        USERS: users,
        DATA_BACKEND: 'd1',
        APP_ENV: 'production',
        PROD_SITE_URL: Cloudflare.Worker.URL,
        CLOUDFLARE_ACCESS_ISSUER: Config.string('CLOUDFLARE_ACCESS_ISSUER'),
        CLOUDFLARE_ACCESS_AUD: Config.string('CLOUDFLARE_ACCESS_AUD'),
        CLOUDFLARE_ACCESS_GOOGLE_AUD: Config.string('CLOUDFLARE_ACCESS_GOOGLE_AUD'),
        CLOUDFLARE_ACCESS_USER_ID_MAP: Config.string('CLOUDFLARE_ACCESS_USER_ID_MAP').pipe(
          Config.withDefault('{}'),
        ),
      },
    });
    return {
      backend: backend.url,
      website: website.url,
      dailyCron: DAILY_CRON,
      cronEnabled: false,
    };
  }),
);
