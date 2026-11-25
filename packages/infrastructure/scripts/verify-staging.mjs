import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { parseEnv } from 'node:util';

const responses = [];
const fetch = async (...args) => {
  const response = await globalThis.fetch(...args);
  responses.push(response);
  return response;
};
process.once('beforeExit', () => {
  responses.length = 0;
});

const backend = process.argv[2];
const website = process.argv[3];
if (!backend || !website)
  throw new Error('Usage: node scripts/verify-staging.mjs BACKEND_URL WEBSITE_URL');
for (const url of [backend, website]) {
  if (!new URL(url).hostname.startsWith('auctionoton-staging-')) {
    throw new Error('This verifier creates trial records and only accepts staging hosts');
  }
}
let local = {};
try {
  local = parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8'));
} catch {
  /* Workers Builds supplies secrets through its environment. */
}
const admin = process.env.CF_TRIAL_ADMIN_TOKEN ?? local.CF_TRIAL_ADMIN_TOKEN;
assert.ok(admin, 'Missing CF_TRIAL_ADMIN_TOKEN');
const operator = { Authorization: `Bearer ${admin}` };
const jsonRequest = (path, data, headers = {}) =>
  fetch(`${backend}${path}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: backend, ...headers },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(30_000),
  });

const homepage = await fetch(website);
assert.equal(homepage.status, 200);
assert.match(homepage.headers.get('cache-control'), /private.*no-store/);
const html = await homepage.text();
assert.match(html, /<title>Auctionoton<\/title>/);
for (const extension of ['css', 'js']) {
  const asset = html.match(new RegExp(`(?:href|src)="([^" ]+\\.${extension})"`))?.[1];
  assert.ok(asset, `Missing ${extension} asset`);
  assert.equal((await fetch(new URL(asset, website))).status, 200);
}
assert.equal((await fetch(`${website}/api/health`)).status, 200);
assert.equal((await fetch(`${backend}/health`)).status, 200);
assert.equal((await jsonRequest('/admin/status')).status, 401);
assert.equal((await jsonRequest('/api/session')).status, 401);
console.info('Workers SSR, static assets, health, and access controls passed.');

const suffix = randomBytes(6).toString('hex');
const credentials = {
  name: 'Cloudflare trial',
  email: `cf-trial-${suffix}@example.com`,
  password: randomBytes(24).toString('hex'),
};
assert.equal((await jsonRequest('/api/auth/sign-up/email', credentials)).status, 403);
const signup = await jsonRequest('/api/auth/sign-up/email', credentials, operator);
assert.equal(signup.status, 200, `D1 sign-up failed with HTTP ${signup.status}`);
const login = await jsonRequest('/api/auth/sign-in/email', credentials);
assert.equal(login.status, 200);
const cookie = login.headers
  .getSetCookie()
  .map((value) => value.split(';')[0])
  .join('; ');
assert.ok(cookie.includes('session_token'));
assert.equal((await jsonRequest('/api/session', undefined, { Cookie: cookie })).status, 200);
assert.equal((await jsonRequest('/api/auth/sign-out', {}, { Cookie: cookie })).status, 200);
assert.equal((await jsonRequest('/api/session', undefined, { Cookie: cookie })).status, 401);
console.info('D1 account, sign-in, authenticated read, and sign-out revocation passed.');

const daily = await jsonRequest('/admin/daily', {}, operator);
assert.equal(daily.status, 202);
const dailyId = (await daily.json()).id;
const duplicate = await jsonRequest('/admin/daily', {}, operator);
assert.equal(duplicate.status, 202);
assert.equal((await duplicate.json()).id, dailyId);
const day = new Date().toISOString().slice(0, 10);
let snapshot;
for (let attempt = 0; attempt < 90; attempt++) {
  const response = await jsonRequest('/admin/status', undefined, operator);
  assert.equal(response.status, 200);
  const status = await response.json();
  assert.equal(status.dailyEnabled, false);
  snapshot = status.snapshots.find((item) => item.day === day);
  if (snapshot?.status === 'complete') break;
  if (snapshot?.status === 'failed') throw new Error(`Live import failed: ${snapshot.error}`);
  if (attempt % 15 === 0)
    console.info('Waiting for the live discovery, Queue, and import Workflow...');
  await delay(2000);
}
assert.equal(snapshot?.status, 'complete', 'Live import did not finish within three minutes');
assert.equal(snapshot.written_rows, snapshot.expected_rows);
const item = await jsonRequest(`/item/2589/ah/${snapshot.auction_house_id}/${snapshot.version}`);
assert.equal(item.status, 200);
const price = await item.json();
assert.equal(price.itemId, 2589, 'The representative Linen Cloth price is absent');
assert.equal(price.stats.lastUpdated, snapshot.fetched_at);
assert.ok(Number.isSafeInteger(price.stats.current.minBuyout));
const replay = await jsonRequest(
  '/admin/import',
  {
    day,
    region: snapshot.region,
    version: snapshot.version,
    auctionHouseId: snapshot.auction_house_id,
  },
  operator,
);
assert.equal(replay.status, 202);
await delay(3000);
const after = await (await jsonRequest('/admin/status', undefined, operator)).json();
const repeated = after.snapshots.find((item) => item.id === snapshot.id);
assert.equal(repeated.written_rows, snapshot.written_rows);
assert.equal(repeated.fetched_at, snapshot.fetched_at);
console.info(
  JSON.stringify(
    {
      status: 'passed',
      snapshotId: snapshot.id,
      rows: snapshot.written_rows,
      rawBytes: snapshot.raw_bytes,
      fetchedAt: snapshot.fetched_at,
      completedAt: snapshot.completed_at,
      cronEnabled: false,
    },
    null,
    2,
  ),
);
await Promise.allSettled(responses.map((response) => response.body?.cancel()));
