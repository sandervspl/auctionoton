import * as Alchemy from 'alchemy';
import * as Cloudflare from 'alchemy/Cloudflare';
import * as RemovalPolicy from 'alchemy/RemovalPolicy';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import type { AuctionJob } from '../../apps/cloudflare/src/contracts';
import type { ProviderCoordinator } from '../../apps/cloudflare/src/provider';

// The existing Node build remains available during the compatibility trial.
process.env.AUCTIONOTON_CLOUDFLARE = '1';

const resourceName = (suffix: string) =>
  Effect.map(Alchemy.Stack, (stack) => `auctionoton-${stack.stage}-${suffix}`);

const market = Cloudflare.D1.Database('Market', {
  name: resourceName('market'),
  primaryLocationHint: 'weur',
  migrations: '../../apps/cloudflare/migrations/market',
}).pipe(RemovalPolicy.retain());
const users = Cloudflare.D1.Database('Users', {
  name: resourceName('users'),
  primaryLocationHint: 'weur',
  migrations: '../../apps/cloudflare/migrations/auth',
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

export const Backend = Cloudflare.Worker('Backend', {
  name: resourceName('backend'),
  main: '../../apps/cloudflare/src/index.ts',
  compatibility: { date: '2026-09-13', flags: ['nodejs_compat'] },
  observability,
  // Enable only after the representative import and production sizing gates pass.
  crons: [],
  env: {
    MARKET: market,
    USERS: users,
    SNAPSHOTS: snapshots,
    AUCTION_JOBS: jobs,
    FAILED_JOBS: failures,
    PROVIDER: Cloudflare.DurableObject<ProviderCoordinator>('ProviderCoordinator'),
    AUCTION_IMPORT: Cloudflare.Workflow<AuctionJob>('AuctionImport'),
    DAILY_DISCOVERY: Cloudflare.Workflow<{ day: string }>('DailyDiscovery'),
    BASE_URL: Cloudflare.Worker.URL,
    ADMIN_TOKEN: Config.redacted('CF_TRIAL_ADMIN_TOKEN'),
    BETTER_AUTH_SECRET: Config.redacted('CF_TRIAL_AUTH_SECRET'),
    TSM_CLIENT_ID: Config.redacted('TSM_CLIENT_ID'),
    TSM_API_KEY: Config.redacted('TSM_API_KEY'),
    TSM_API_KEY_B: Config.redacted('TSM_API_KEY_B'),
    TSM_API_KEY_C: Config.redacted('TSM_API_KEY_C'),
    TSM_API_KEY_D: Config.redacted('TSM_API_KEY_D'),
    TRIAL_HOUSE_ID: Config.string('CF_TRIAL_HOUSE_ID'),
    TRIAL_REGION: 'eu',
    TRIAL_VERSION: 'seasonal',
    DAILY_ENABLED: 'false' as string,
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
    if (!['staging', 'local'].includes(stack.stage)) {
      throw new Error('This compatibility trial only supports staging or local.');
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
    const website = yield* Cloudflare.Website.Vite('Website', {
      name: resourceName('website'),
      rootDir: '../../apps/website',
      memo: {
        include: ['src/**', 'public/**', '*.ts', '*.json', '../../packages/typescript-config/**'],
        exclude: ['src/styled-system/**', 'src/routeTree.gen.ts', '**/node_modules/**'],
        lockfile: true,
      },
      compatibility: { date: '2026-09-13', flags: ['nodejs_compat'] },
      observability,
      env: {
        TRIAL_BACKEND: backend,
        CLOUDFLARE_ACCESS_ISSUER: Config.string('CLOUDFLARE_ACCESS_ISSUER'),
        CLOUDFLARE_ACCESS_AUD: Config.string('CLOUDFLARE_ACCESS_AUD'),
        CLOUDFLARE_ACCESS_USER_ID_MAP: Config.string('CLOUDFLARE_ACCESS_USER_ID_MAP').pipe(
          Config.withDefault('{}'),
        ),
        // Existing database routes are migrated in phase 2.
        DB_URL: 'postgres://trial:trial@127.0.0.1:5432/trial',
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
