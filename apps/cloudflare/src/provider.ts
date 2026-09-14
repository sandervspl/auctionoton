import { DurableObject } from 'cloudflare:workers';
import type { Version } from './contracts';
import type { Env } from './env';
import { readBoundedText } from './http';

const apiKeys = (env: Env): Record<Version, string> => ({
  anniversary: env.TSM_API_KEY,
  forever: env.TSM_API_KEY,
  seasonal: env.TSM_API_KEY,
  classic: env.TSM_API_KEY_B,
  hardcore: env.TSM_API_KEY_C,
  era: env.TSM_API_KEY_D,
});

export class ProviderCoordinator extends DurableObject<Env> {
  private refreshing = new Map<Version, Promise<string>>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS tokens (
      version TEXT PRIMARY KEY, identity TEXT NOT NULL, token TEXT NOT NULL, expires INTEGER NOT NULL
    )`);
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS throttle (id INTEGER PRIMARY KEY, next_request INTEGER NOT NULL)',
    );
  }

  async token(version: Version): Promise<string> {
    const pending = this.refreshing.get(version);
    if (pending) return pending;
    const refresh = this.loadToken(version);
    this.refreshing.set(version, refresh);
    try {
      return await refresh;
    } finally {
      this.refreshing.delete(version);
    }
  }

  private async loadToken(version: Version) {
    const key = apiKeys(this.env)[version];
    if (!key) throw new Error('Missing TSM credential');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    const identity = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    const cached = this.ctx.storage.sql
      .exec<{ token: string; expires: number; identity: string }>(
        'SELECT token, expires, identity FROM tokens WHERE version = ?',
        version,
      )
      .toArray()[0];
    if (cached?.identity === identity && cached.expires > Date.now() + 60_000) return cached.token;

    const response = await fetch('https://auth.tradeskillmaster.com/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: this.env.TSM_CLIENT_ID,
        grant_type: 'api_token',
        scope: 'app:realm-api app:pricing-api',
        token: key,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`TSM authentication HTTP ${response.status}`);
    }
    const data = JSON.parse(await readBoundedText(response, 32 * 1024)) as {
      access_token?: string;
      expires_in?: number;
      expires_at?: number;
    };
    if (!data.access_token) throw new Error('Invalid TSM authentication response');
    // Short fallback avoids assuming the old hardcoded 24-hour token lifetime.
    const expires =
      typeof data.expires_in === 'number'
        ? Date.now() + data.expires_in * 1000
        : typeof data.expires_at === 'number'
          ? data.expires_at * 1000
          : Date.now() + 5 * 60_000;
    this.ctx.storage.sql.exec(
      'INSERT OR REPLACE INTO tokens(version, identity, token, expires) VALUES (?, ?, ?, ?)',
      version,
      identity,
      data.access_token,
      expires,
    );
    return data.access_token;
  }

  invalidate(version: Version, token: string) {
    this.ctx.storage.sql.exec('DELETE FROM tokens WHERE version = ? AND token = ?', version, token);
  }

  reserve(): number {
    const now = Date.now();
    const next =
      this.ctx.storage.sql
        .exec<{ next_request: number }>('SELECT next_request FROM throttle WHERE id = 1')
        .toArray()[0]?.next_request ?? 0;
    if (next > now) return next - now;
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO throttle VALUES (1, ?)', now + 1000);
    return 0;
  }

  remainingCooldown(): number {
    const next =
      this.ctx.storage.sql
        .exec<{ next_request: number }>('SELECT next_request FROM throttle WHERE id = 1')
        .toArray()[0]?.next_request ?? 0;
    return Math.max(0, next - Date.now());
  }

  cooldown(until: number) {
    this.ctx.storage.sql.exec(
      'INSERT INTO throttle VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET next_request = MAX(next_request, excluded.next_request)',
      until,
    );
  }
}

export async function providerFetch(env: Env, version: Version, url: string): Promise<Response> {
  const coordinator = env.PROVIDER.getByName(
    `tsm-${version === 'anniversary' || version === 'forever' ? 'seasonal' : version}`,
  );
  const token = await coordinator.token(version);
  let wait = await coordinator.reserve();
  while (wait > 0) {
    if (wait > 25_000) throw new Error('TSM cooldown active; retry later');
    await new Promise((resolve) => setTimeout(resolve, wait));
    wait = await coordinator.reserve();
  }
  const response = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (response.ok) return response;
  await response.body?.cancel();
  if (response.status === 401) await coordinator.invalidate(version, token);
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const seconds = Number(retryAfter);
    const until =
      retryAfter && Number.isFinite(seconds)
        ? Date.now() + seconds * 1000
        : Date.parse(retryAfter ?? '');
    await coordinator.cooldown(Number.isFinite(until) ? until : Date.now() + 60_000);
  }
  throw new Error(`TSM data HTTP ${response.status}`);
}

export function providerRetry(env: Env, version: Version) {
  return {
    retries: {
      limit: 4,
      delay: async () =>
        Math.max(
          30_000,
          await env.PROVIDER.getByName(
            `tsm-${version === 'anniversary' || version === 'forever' ? 'seasonal' : version}`,
          ).remainingCooldown(),
        ),
    },
    timeout: '5 minutes',
  } as const;
}
