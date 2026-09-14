import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth } from './auth';
import { houseKey, parseJob, snapshotId, versions } from './contracts';
import type { AuctionJob } from './contracts';
import type { Env } from './env';
import { websiteData } from './website-data';
import { MAINTENANCE_CRON } from './retention';
import { enabledHouseJobs } from './discovery';
export { ProviderCoordinator } from './provider';
export { AuctionImport, DailyDiscovery, MarketMaintenance } from './workflows';

const app = new Hono<{ Bindings: Env }>();
app.get('/health', (c) => c.text('OK'));
app.use('/item/*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'] }));
app.use('/admin/*', async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  if (c.req.header('Authorization') !== `Bearer ${c.env.ADMIN_TOKEN}`)
    return c.json({ error: 'Unauthorized' }, 401);
  await next();
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
app.get('/item/:id/ah/:ah_id/:version', async (c) => {
  const itemId = Number(c.req.param('id'));
  const ah = Number(c.req.param('ah_id'));
  const version = c.req.param('version');
  if (
    !Number.isSafeInteger(itemId) ||
    itemId <= 0 ||
    !Number.isSafeInteger(ah) ||
    ah <= 0 ||
    !versions.includes(version as (typeof versions)[number])
  )
    return c.json({ error: true, reason: 'Invalid item query' }, 400);
  const rows =
    await c.env.MARKET.prepare(`SELECT p.*, s.fetched_at, s.provider_modified_at, s.region FROM published_houses h
    JOIN snapshots s ON s.id = h.snapshot_id AND s.status = 'complete'
    JOIN prices p ON p.snapshot_id = s.id
    WHERE s.auction_house_id = ? AND s.version = ? AND p.item_id = ? AND p.pet_species_id = 0 LIMIT 2`)
      .bind(ah, version, itemId)
      .all<{
        item_id: number;
        min_buyout: number;
        quantity: number;
        market_value: number;
        historical: number;
        num_auctions: number;
        fetched_at: string;
        provider_modified_at: string | null;
        region: string;
      }>();
  if (rows.results.length > 1)
    return c.json({ error: true, reason: 'Ambiguous auction house region' }, 409);
  const price = rows.results[0];
  if (!price) return c.json({ error: true, reason: 'Item not found' });
  const metadata = await websiteData(c.env).item(itemId);
  c.header('Cache-Control', 'public, max-age=300');
  c.header(
    'X-Auctionoton-Stale',
    String(Date.now() - Date.parse(price.fetched_at) > 26 * 60 * 60_000),
  );
  return c.json({
    server: '',
    itemId,
    name: metadata?.name ?? `Item ${itemId}`,
    sellPrice: 0,
    vendorPrice: 0,
    tooltip: [{ label: metadata?.name ?? `Item ${itemId}` }],
    itemLink: '',
    uniqueName: metadata?.slug ?? `item-${itemId}`,
    stats: {
      lastUpdated: price.fetched_at,
      current: {
        numAuctions: price.num_auctions,
        marketValue: price.market_value,
        historicalValue: price.historical,
        minBuyout: price.min_buyout,
        quantity: price.quantity,
      },
      previous: null,
    },
    tags: [],
    icon: metadata?.icon ?? null,
    itemLevel: metadata?.itemLevel ?? null,
    requiredLevel: metadata?.requiredLevel ?? null,
  });
});
app.onError((error, c) => {
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
