import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { toJSON } from 'seroval';

let server;
let origin;
let accessCookie;
let googleCookie;
let rpcIds;

before(async () => {
  const portReservation = createServer();
  portReservation.listen(0, '127.0.0.1');
  await once(portReservation, 'listening');
  const { port } = portReservation.address();
  await new Promise((resolve) => portReservation.close(resolve));
  origin = `http://127.0.0.1:${port}`;
  const serverBundle = await readFile(
    new URL('../.output/server/_ssr/ssr.mjs', import.meta.url),
    'utf8',
  );
  rpcIds = Object.fromEntries(
    [
      ...serverBundle.matchAll(
        /"([a-f0-9]{64})":\s*\{\s*functionName: "([^"]+)_createServerFn_handler"/g,
      ),
    ].map(([, id, name]) => [name, id]),
  );
  assert.ok(
    rpcIds.createDashboardSection && rpcIds.getSession,
    'Missing compiled server-function IDs',
  );
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = { ...(await exportJWK(publicKey)), kid: 'smoke-key', alg: 'RS256' };
  const token = await new SignJWT({ type: 'app', email: 'smoke@example.com' })
    .setProtectedHeader({ alg: 'RS256', kid: 'smoke-key' })
    .setIssuer('https://test-team.cloudflareaccess.com')
    .setAudience('smoke-test-audience')
    .setSubject('smoke-user')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
  accessCookie = `CF_Authorization=${token}`;
  googleCookie = `CF_Authorization=${await new SignJWT({ type: 'app', email: 'google@example.com' })
    .setProtectedHeader({ alg: 'RS256', kid: 'smoke-key' })
    .setIssuer('https://test-team.cloudflareaccess.com')
    .setAudience('smoke-test-google-audience')
    .setSubject('google-user')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)}`;

  // These signed-out checks use no real credentials or database connection.
  server = spawn(
    process.execPath,
    ['--import', './tests/fixtures/access-jwks.mjs', '.output/server/index.mjs'],
    {
      cwd: new URL('..', import.meta.url),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: String(port),
        APP_ENV: 'production',
        PROD_SITE_URL: 'https://auctionoton.example',
        CLOUDFLARE_ACCESS_ISSUER: 'https://test-team.cloudflareaccess.com',
        CLOUDFLARE_ACCESS_AUD: 'smoke-test-audience',
        CLOUDFLARE_ACCESS_GOOGLE_AUD: 'smoke-test-google-audience',
        CLOUDFLARE_ACCESS_USER_ID_MAP: '{}',
        ACCESS_TEST_JWKS: JSON.stringify({ keys: [publicJwk] }),
        DB_URL: 'postgres://smoke:smoke@127.0.0.1:1/smoke',
      },
      stdio: 'ignore',
    },
  );

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
  assert.match(html, /<button[^>]*aria-haspopup="dialog"[^>]*>Sign in<\/button>/);
  assert.doesNotMatch(html, /clerk/i);
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

test('Access routes reject anonymous and forged identities before using a database', async () => {
  for (const path of ['/api/session', '/auth/login', '/auth/google']) {
    for (const headers of [
      {},
      { Cookie: 'CF_Authorization=forged' },
      { 'Cf-Access-Jwt-Assertion': 'forged' },
      { 'Cf-Access-Authenticated-User-Email': 'attacker@example.com' },
    ]) {
      const response = await fetch(`${origin}${path}`, { headers, redirect: 'manual' });
      assert.equal(response.status, 401, path);
      assert.match(response.headers.get('cache-control'), /no-store/);
    }
  }
});

test('Google login verifies its own audience and safely returns to the website', async () => {
  const headers = { Cookie: googleCookie };
  const response = await fetch(`${origin}/api/session`, { headers });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).session.email, 'google@example.com');
  for (const [returnTo, expected] of [
    ['/user/dashboard?view=all#collection', '/user/dashboard?view=all#collection'],
    ['//attacker.example', '/'],
    ['/auth/google', '/'],
  ]) {
    const login = await fetch(`${origin}/auth/google?returnTo=${encodeURIComponent(returnTo)}`, {
      headers,
      redirect: 'manual',
    });
    assert.equal(login.status, 303);
    assert.equal(login.headers.get('location'), expected);
    assert.match(login.headers.get('cache-control'), /no-store/);
  }
});

test('the production build verifies a signed Access session and renders its account controls', async () => {
  const headers = { Cookie: accessCookie };
  const response = await fetch(`${origin}/api/session`, { headers });
  assert.equal(response.status, 200);
  const { session } = await response.json();
  assert.equal(session.email, 'smoke@example.com');
  assert.equal(session.userId, 'access:https://test-team.cloudflareaccess.com#smoke-user');
  assert.equal(session.token, undefined);
  assert.match(response.headers.get('cache-control'), /private.*no-store/);
  const home = await fetch(origin, { headers });
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Sign out/);
  assert.match(html, /href="\/user\/dashboard"/);
  assert.doesNotMatch(html, /clerk/i);
  for (const [returnTo, expected] of [
    ['/user/dashboard', '/user/dashboard'],
    ['//attacker.example', '/'],
    ['/auth/login', '/'],
  ]) {
    const login = await fetch(`${origin}/auth/login?returnTo=${encodeURIComponent(returnTo)}`, {
      headers,
      redirect: 'manual',
    });
    assert.equal(login.status, 303);
    assert.equal(login.headers.get('location'), expected);
  }
});

test('sign-out rejects cross-site requests and preserves the cookie for Access to revoke', async () => {
  for (const headers of [{}, { Origin: 'https://attacker.example' }]) {
    const response = await fetch(`${origin}/api/logout`, { method: 'POST', headers });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('set-cookie'), null);
  }
  const response = await fetch(`${origin}/api/logout`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: accessCookie },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.deepEqual(await response.json(), { logoutUrl: '/cdn-cgi/access/logout' });
  assert.match(response.headers.get('cache-control'), /no-store/);
});

test('server functions reject cross-origin cookie-authenticated writes and accept same-origin session reads', async () => {
  const body = JSON.stringify(
    toJSON({ data: { section_name: 'Cross-origin write' }, context: {} }),
  );
  for (const fetchSite of [null, 'cross-site', 'same-site']) {
    const headers = new Headers({
      Cookie: accessCookie,
      Origin: 'https://other.auctionoton.example',
      'Content-Type': 'text/plain; application/json',
    });
    if (fetchSite) headers.set('Sec-Fetch-Site', fetchSite);
    const response = await fetch(`${origin}/_serverFn/${rpcIds.createDashboardSection}`, {
      method: 'POST',
      body,
      headers,
    });
    assert.equal(response.status, 403, String(fetchSite));
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
  const response = await fetch(`${origin}/_serverFn/${rpcIds.getSession}`, {
    headers: {
      Cookie: accessCookie,
      Origin: origin,
      'x-tsr-serverFn': 'true',
      Accept: 'application/json',
    },
  });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /smoke@example\.com/);
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
