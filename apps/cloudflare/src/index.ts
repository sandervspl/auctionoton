import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth } from './auth';
import { houseKey, parseJob, snapshotId, versions } from './contracts';
import type { AuctionJob } from './contracts';
import type { Env } from './env';
import { publicItems } from './public-items';
import { MAINTENANCE_CRON } from './retention';
import { enabledHouseJobs } from './discovery';
import { getRealms } from './realms';
import type { Region, Version } from './contracts';
import { PUBLIC_CACHE_CONTROL, purgeMarketCache } from './public-cache';
export { ProviderCoordinator } from './provider';
export { AuctionImport, DailyDiscovery, MarketMaintenance } from './workflows';

const app = new Hono<{ Bindings: Env }>();
app.use('*', async (c, next) => {
  // Native Workers Cache otherwise applies heuristic caching to some statuses.
  c.header('Cache-Control', 'no-store');
  await next();
});
app.get('/health', (c) => c.text('OK'));
app.use('/item/*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'] }));
app.use('/items/*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'] }));
app.use('/realms/*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'] }));
app.get('/realms/:region/:version', async (c) => {
  const region = c.req.param('region');
  const version = c.req.param('version');
  c.header('Cache-Control', 'no-store');
  if (!['eu', 'us'].includes(region) || !versions.includes(version as Version))
    return c.json({ error: 'Invalid region or game version' }, 400);
  try {
    const realms = await getRealms(c.env, region as Region, version as Version);
    c.header('Cache-Control', PUBLIC_CACHE_CONTROL);
    c.header('Cache-Tag', 'realm-catalog');
    return c.json(realms);
  } catch (error) {
    console.error('Realm catalog unavailable', { region, version, error });
    return c.json({ error: 'Realms are temporarily unavailable. Please try again.' }, 503);
  }
});
app.use('/admin/*', async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  if (c.req.header('Authorization') !== `Bearer ${c.env.ADMIN_TOKEN}`)
    return c.json({ error: 'Unauthorized' }, 401);
  await next();
});
app.post('/admin/cache/market', async (c) => {
  let job: AuctionJob;
  try {
    job = parseJob(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid market' }, 400);
  }
  // Purging here targets the default API entrypoint's cache, not the Workflow's.
  return c.json(await purgeMarketCache((c.executionCtx as ExecutionContext).cache, job));
});
app.post('/admin/daily', async (c) => {
  const day = new Date().toISOString().slice(0, 10);
  const id = `daily-${day}`;
  await c.env.DAILY_DISCOVERY.createBatch([{ id, params: { day } }]);
  return c.json({ id }, 202);
});
app.post('/admin/maintenance', async (c) => {
  const now = new Date().toISOString();
  const id = `maintenance-${now.slice(0, 10)}`;
  await c.env.MARKET_MAINTENANCE.createBatch([{ id, params: { now } }]);
  return c.json({ id }, 202);
});
app.post('/admin/import', async (c) => {
  let job: AuctionJob;
  try {
    job = parseJob(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid import job' }, 400);
  }
  if (!enabledHouseJobs(c.env, job.day).some((target) => houseKey(target) === houseKey(job))) {
    return c.json({ error: 'Only configured auction houses are enabled' }, 400);
  }
  await c.env.AUCTION_JOBS.send(job);
  return c.json({ id: snapshotId(job) }, 202);
});
app.get('/admin/status', async (c) => {
  const snapshots =
    await c.env.MARKET.prepare(`SELECT s.*, (SELECT COUNT(*) FROM prices p WHERE p.snapshot_id = s.id) AS written_rows
    FROM snapshots s ORDER BY day DESC LIMIT 30`).all();
  return c.json({
    dailyEnabled: c.env.DAILY_ENABLED === 'true',
    snapshots: snapshots.results.map((row) => ({
      ...row,
      storage_id: row.id,
      id: row.snapshot_key,
    })),
  });
});
app.get('/admin/workflow/:id', async (c) => {
  const instance = await c.env.AUCTION_IMPORT.get(c.req.param('id'));
  return c.json(await instance.status());
});
app.post('/admin/retry/:id', async (c) => {
  const instance = await c.env.AUCTION_IMPORT.get(c.req.param('id'));
  const status = await instance.status();
  if (status.status !== 'errored')
    return c.json({ error: 'Only failed imports can be restarted' }, 409);
  await instance.restart();
  return c.json({ id: c.req.param('id') }, 202);
});

app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
});
app.on(['POST', 'GET'], '/api/auth/*', async (c) => {
  // Trial accounts require an operator invitation; existing Clerk users are not imported yet.
  if (
    c.req.path === '/api/auth/sign-up/email' &&
    c.req.header('Authorization') !== `Bearer ${c.env.ADMIN_TOKEN}`
  ) {
    return c.json({ error: 'Trial registration requires an invitation' }, 403);
  }
  return createAuth(c.env, c.req.header('Authorization') === `Bearer ${c.env.ADMIN_TOKEN}`).handler(
    c.req.raw,
  );
});
app.get('/api/session', async (c) => {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  return session
    ? c.json({ user: { id: session.user.id, name: session.user.name, email: session.user.email } })
    : c.json({ error: 'Unauthorized' }, 401);
});
app.route('/', publicItems);
app.onError((error, c) => {
  c.header('Cache-Control', 'no-store');
  console.error('Request failed', { path: c.req.path, error: error.name });
  return c.json({ error: true, reason: 'Service unavailable' }, 503);
});

export default {
  fetch: app.fetch,
  async scheduled(event, env) {
    if (event.cron === MAINTENANCE_CRON) {
      const now = new Date(event.scheduledTime).toISOString();
      await env.MARKET_MAINTENANCE.createBatch([
        { id: `maintenance-${now.slice(0, 10)}`, params: { now } },
      ]);
      return;
    }
    if (env.DAILY_ENABLED !== 'true') return;
    const day = new Date(event.scheduledTime).toISOString().slice(0, 10);
    await env.DAILY_DISCOVERY.createBatch([{ id: `daily-${day}`, params: { day } }]);
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        const job = parseJob(message.body);
        // createBatch skips existing IDs, so duplicate Queue deliveries are safe.
        await env.AUCTION_IMPORT.createBatch([{ id: snapshotId(job), params: job }]);
        message.ack();
      } catch {
        message.retry({ delaySeconds: 30 });
      }
    }
  },
} satisfies ExportedHandler<Env, AuctionJob>;
