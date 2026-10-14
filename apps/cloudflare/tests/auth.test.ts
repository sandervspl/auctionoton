import { env, exports } from 'cloudflare:workers';
import { expect, it } from 'vitest';

const origin = 'https://trial.example.com';
const request = (path: string, data?: object, headers?: HeadersInit) =>
  exports.default.fetch(`${origin}${path}`, {
    method: data ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'cf-connecting-ip': '192.0.2.1',
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

it('requires an invitation, stores users/sessions in D1, and revokes sign-out cookies', async () => {
  expect((await request('/api/session')).status).toBe(401);
  const credentials = {
    name: 'Trial user',
    email: 'trial@example.com',
    password: 'a-long-test-password-123',
  };
  expect((await request('/api/auth/sign-up/email', credentials)).status).toBe(403);
  const signup = await request('/api/auth/sign-up/email', credentials, {
    Authorization: `Bearer ${env.ADMIN_TOKEN}`,
  });
  expect(signup.status, await signup.clone().text()).toBe(200);
  const user = await env.USERS.prepare('SELECT id FROM user WHERE email = ?')
    .bind(credentials.email)
    .first<{ id: string }>();
  expect(user?.id).toBeTruthy();
  const signedIn = await request('/api/auth/sign-in/email', credentials);
  expect(signedIn.status, await signedIn.clone().text()).toBe(200);
  const cookie = signedIn.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  expect(cookie).toContain('session_token');
  const session = await request('/api/session', undefined, { Cookie: cookie });
  expect(session.status).toBe(200);
  expect(((await session.json()) as { user: { id: string } }).user.id).toBe(user?.id);
  expect((await request('/api/auth/sign-out', {}, { Cookie: cookie })).status).toBe(200);
  expect((await request('/api/session', undefined, { Cookie: cookie })).status).toBe(401);
});

it('protects all control routes and rejects imports outside the trial scope', async () => {
  expect((await request('/admin/status')).status).toBe(401);
  expect((await request('/admin/import', {})).status).toBe(401);
  expect(
    (
      await request(
        '/admin/import',
        {
          region: 'eu',
          version: 'seasonal',
          auctionHouseId: 999,
          day: '2026-09-13',
        },
        { Authorization: `Bearer ${env.ADMIN_TOKEN}` },
      )
    ).status,
  ).toBe(400);
  const health = await request('/health');
  expect(await health.text()).toBe('OK');
});
