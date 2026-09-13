import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

let server;
let origin;

before(async () => {
  const portReservation = createServer();
  portReservation.listen(0, '127.0.0.1');
  await once(portReservation, 'listening');
  const { port } = portReservation.address();
  await new Promise((resolve) => portReservation.close(resolve));
  origin = `http://127.0.0.1:${port}`;

  // These signed-out checks use no real credentials or database connection.
  server = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
      APP_ENV: 'production',
      PROD_SITE_URL: 'https://auctionoton.example',
      CLERK_PUBLISHABLE_KEY: 'pk_test_Y2xlcmsuZXhhbXBsZS5jb20k',
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_Y2xlcmsuZXhhbXBsZS5jb20k',
      CLERK_SECRET_KEY: 'sk_test_smoke_test_placeholder',
      DB_URL: 'postgres://smoke:smoke@127.0.0.1:1/smoke',
    },
    stdio: 'ignore',
  });

  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(server.exitCode, null, 'Production server exited during startup');
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {
      // Wait for the production listener.
    }
    await delay(100);
  }
  throw new Error('Production server did not become healthy');
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
  }
});

test('health endpoint works without a database', async () => {
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'OK');
});

test('homepage renders server HTML and serves its stylesheet and module script', async () => {
  const response = await fetch(origin);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /private.*no-store/);
  assert.match(html, /<title>Auctionoton<\/title>/);
  assert.match(html, /Auction House prices for all World of Warcraft classic realms/);
  assert.match(html, /<html[^>]*lang="en"/);
  for (const extension of ['css', 'js']) {
    const asset = html.match(new RegExp(`(?:href|src)="([^" ]+\\.${extension})"`))?.[1];
    assert.ok(asset, `Missing ${extension} asset in rendered HTML`);
    const assetResponse = await fetch(new URL(asset, origin));
    assert.equal(assetResponse.status, 200);
    assert.match(
      assetResponse.headers.get('content-type'),
      extension === 'css' ? /css/ : /javascript/,
    );
  }
});

test('signed-out dashboard requests redirect before accessing the database', async () => {
  const response = await fetch(`${origin}/user/dashboard`, { redirect: 'manual' });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), '/?error=unauthorized');
});

test('unknown routes and malformed item URLs return 404', async () => {
  for (const path of [
    '/missing',
    '/item/invalid/eu/alliance/item-1',
    '/item/chaos-bolt/eu/alliance/item-invalid',
  ]) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 404, path);
    assert.match(await response.text(), /Return Home/);
  }
});

test('SEO endpoints use the runtime public origin and exclude private pages', async () => {
  const sitemap = await fetch(`${origin}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get('content-type'), /application\/xml/);
  const xml = await sitemap.text();
  assert.match(xml, /<loc>https:\/\/auctionoton\.example\/<\/loc>/);
  assert.doesNotMatch(xml, /dashboard/);
  const robots = await fetch(`${origin}/robots.txt`);
  assert.equal(robots.status, 200);
  assert.match(
    await robots.text(),
    /Disallow: \/user\/\n\nSitemap: https:\/\/auctionoton\.example\/sitemap\.xml/,
  );
});
