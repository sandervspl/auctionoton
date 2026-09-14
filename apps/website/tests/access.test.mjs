import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { accessToken, safeReturnTo, verifyAccessSession } from '../src/services/access-token.ts';
import { signOutOfAccess } from '../src/services/access-logout.ts';

const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwks = createLocalJWKSet({
  keys: [{ ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256' }],
});
const config = {
  issuer: 'https://test-team.cloudflareaccess.com',
  audience: 'auctionoton-staging',
  googleAudience: 'auctionoton-staging-google',
};
const now = Math.floor(Date.now() / 1000);
const claims = {
  iss: config.issuer,
  aud: [config.audience],
  type: 'app',
  sub: 'user-1',
  email: 'one@example.com',
  iat: now,
  exp: now + 3600,
};
const sign = (changes = {}) =>
  new SignJWT({ ...claims, ...changes })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .sign(privateKey);
const request = (token) =>
  new Request('https://auctionoton.example/api/session', {
    headers: { Cookie: `CF_Authorization=${token}` },
  });

test('accepts signed Access browser cookies and assertion headers without exposing the JWT', async () => {
  const token = await sign();
  for (const req of [
    request(token),
    new Request('https://auctionoton.example', { headers: { 'Cf-Access-Jwt-Assertion': token } }),
  ]) {
    const session = await verifyAccessSession(req, config, jwks);
    assert.deepEqual(session, {
      userId: `access:${config.issuer}#user-1`,
      identity: `${config.issuer}#user-1`,
      email: 'one@example.com',
      expiresAt: (now + 3600) * 1000,
    });
    assert.equal(JSON.stringify(session).includes(token), false);
  }
});

test('accepts the configured Google audience with the same stable owner identity', async () => {
  const password = await verifyAccessSession(request(await sign()), config, jwks);
  const googleToken = await sign({ aud: [config.googleAudience] });
  assert.deepEqual(await verifyAccessSession(request(googleToken), config, jwks), password);
  assert.equal(
    await verifyAccessSession(request(googleToken), { ...config, googleAudience: undefined }, jwks),
    null,
  );
});

for (const [name, changes] of Object.entries({
  expired: { exp: now - 10 },
  future: { nbf: now + 600 },
  futureIssueTime: { iat: now + 600 },
  wrongAudience: { aud: ['bingo'] },
  productionAudience: { aud: ['auctionoton-production'] },
  productionGoogleAudience: { aud: ['auctionoton-production-google'] },
  wrongIssuer: { iss: 'https://other.cloudflareaccess.com' },
  wrongType: { type: 'org' },
  noExpiry: { exp: undefined },
  noSubject: { sub: undefined },
  emptySubject: { sub: '' },
  noEmail: { email: undefined },
  unverifiedEmail: { email_verified: false },
  malformedEmail: { email: 'one@' },
})) {
  test(`rejects ${name} even when correctly signed`, async () => {
    assert.equal(await verifyAccessSession(request(await sign(changes)), config, jwks), null);
  });
}

test('rejects a forged signature, wrong algorithm, and malformed assertion; never falls back to a valid cookie', async () => {
  const other = await generateKeyPair('RS256');
  const forged = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .sign(other.privateKey);
  const wrongAlg = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(new Uint8Array(32));
  for (const token of ['forged', forged, wrongAlg])
    assert.equal(await verifyAccessSession(request(token), config, jwks), null);
  const req = request(await sign());
  req.headers.set('Cf-Access-Jwt-Assertion', 'forged');
  assert.equal(accessToken(req), 'forged');
  assert.equal(await verifyAccessSession(req, config, jwks), null);
});

test('ignores unsigned identity headers and permits anonymous public pages without auth configuration', async () => {
  assert.equal(
    await verifyAccessSession(
      new Request('https://auctionoton.example', {
        headers: { 'Cf-Access-Authenticated-User-Email': 'one@example.com' },
      }),
      { issuer: '', audience: '' },
    ),
    null,
  );
  await assert.rejects(
    verifyAccessSession(
      request(await sign()),
      { issuer: 'https://attacker.example', audience: 'test' },
      jwks,
    ),
    /must be configured/,
  );
});

test('keeps certificate outages distinct from invalid authentication', async () => {
  const failure = new Error('certificate service unavailable');
  await assert.rejects(
    verifyAccessSession(request(await sign()), config, async () => {
      throw failure;
    }),
    (error) => error === failure,
  );
});

test('preserves a reviewed legacy owner ID by verified issuer and subject, never by email', async () => {
  const mappedConfig = {
    ...config,
    userIdMap: JSON.stringify({
      [`${config.issuer}#user-1`]: 'user_legacy_owner',
      'one@example.com': 'user_wrong_owner',
    }),
  };
  assert.equal(
    (await verifyAccessSession(request(await sign()), mappedConfig, jwks)).userId,
    'user_legacy_owner',
  );
  assert.equal(
    (await verifyAccessSession(request(await sign({ sub: 'user-2' })), mappedConfig, jwks)).userId,
    `access:${config.issuer}#user-2`,
  );
  await assert.rejects(
    verifyAccessSession(request(await sign()), { ...config, userIdMap: '[]' }, jwks),
    /Invalid Access/,
  );
  await assert.rejects(
    verifyAccessSession(
      request(await sign()),
      { ...config, userIdMap: JSON.stringify({ [`${config.issuer}#user-1`]: 42 }) },
      jwks,
    ),
    /Invalid Access/,
  );
});

test('login redirects remain local and cannot re-enter authentication endpoints', () => {
  for (const value of [
    null,
    '',
    'https://attacker.example',
    '//attacker.example',
    '/\\attacker.example',
    '/\nattacker.example',
    '/auth/login',
    '/api/logout',
    '/cdn-cgi/access/logout',
  ])
    assert.equal(safeReturnTo(value), '/', String(value));
  assert.equal(
    safeReturnTo('/user/dashboard?view=all#collection'),
    '/user/dashboard?view=all#collection',
  );
});

for (const type of ['basic', 'opaqueredirect']) {
  test(`logout clears the session without following the Access ${type} response`, async () => {
    const calls = [];
    await signOutOfAccess(async (url, options) => {
      calls.push(url);
      assert.equal(options.credentials, 'same-origin');
      if (url === '/api/logout') {
        assert.equal(options.method, 'POST');
        return Response.json({ logoutUrl: '/cdn-cgi/access/logout' });
      }
      assert.equal(options.cache, 'no-store');
      if (url === '/cdn-cgi/access/logout') {
        assert.equal(options.redirect, 'manual');
        return type === 'opaqueredirect'
          ? { ok: false, type, status: 0 }
          : new Response('<html>Logged out</html>');
      }
      assert.equal(url, '/api/session');
      return Response.json({ session: null }, { status: 401 });
    });
    assert.deepEqual(calls, ['/api/logout', '/cdn-cgi/access/logout', '/api/session']);
  });
}

for (const failure of ['csrf', 'network', 'access', 'active-session', 'session-outage']) {
  test(`logout does not report success after ${failure}`, async () => {
    await assert.rejects(
      signOutOfAccess(async (url) => {
        if (url === '/api/logout')
          return new Response(null, { status: failure === 'csrf' ? 403 : 200 });
        if (url === '/cdn-cgi/access/logout') {
          if (failure === 'network') throw new TypeError('Network unavailable');
          return new Response(null, { status: failure === 'access' ? 503 : 200 });
        }
        if (failure === 'session-outage') return new Response(null, { status: 503 });
        return Response.json({ session: { email: 'still-signed-in@example.com' } });
      }),
    );
  });
}
