import { setTimeout as delay } from 'node:timers/promises';
import { compactItemIcon } from '../../../apps/cloudflare/src/item-icons.ts';

export async function blizzardCatalog(clientId, clientSecret, onProgress = () => {}) {
  const tokenResponse = await fetch('https://eu.battle.net/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(30000),
  });
  if (!tokenResponse.ok) throw new Error(`Blizzard authentication failed: ${tokenResponse.status}`);
  const { access_token: accessToken } = await tokenResponse.json();
  if (!accessToken) throw new Error('Missing Blizzard access token');

  async function request(path, params) {
    const query = new URLSearchParams({
      namespace: 'static-classic1x-eu',
      locale: 'en_US',
      ...params,
    });
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await fetch(`https://eu.api.blizzard.com/data/wow/${path}?${query}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(30000),
      });
      if (response.ok) return response.json();
      await response.body?.cancel();
      if ((response.status !== 429 && response.status < 500) || attempt === 4)
        throw new Error(`Blizzard ${path} failed: ${response.status}`);
      const retryAfter = response.headers.get('retry-after');
      const wait =
        retryAfter && /^\d+$/.test(retryAfter)
          ? Number(retryAfter) * 1000
          : Math.max(0, Date.parse(retryAfter ?? '') - Date.now()) || 1000 * 2 ** attempt;
      await delay(wait);
    }
    throw new Error('Blizzard retries exhausted');
  }

  async function download(kind, extra = {}) {
    const rows = [];
    let cursor = 1;
    while (true) {
      const { results } = await request(`search/${kind}`, {
        ...extra,
        _pageSize: '1000',
        orderby: 'id',
        id: `[${cursor},]`,
      });
      if (!Array.isArray(results)) throw new Error(`Invalid Blizzard ${kind} page`);
      if (results.length === 0) break;
      for (const row of results) {
        if (!Number.isSafeInteger(row.data?.id) || row.data.id < cursor)
          throw new Error(`Invalid Blizzard ${kind} ID pagination`);
        if (
          kind === 'media' &&
          !new URL(row.key.href).pathname.endsWith(`/media/item/${row.data.id}`)
        )
          throw new Error('Non-item media in Blizzard item search');
        rows.push(row.data);
        cursor = row.data.id + 1;
      }
      onProgress(`Downloaded ${rows.length} ${kind} records`);
      // The provider caps result windows; advance by ID, never by page number.
      if (results.length < 1000) break;
    }
    return rows;
  }

  const media = await download('media', { tags: 'item' });
  const icons = new Map(
    media.map((row) => {
      const asset = row.assets?.find((asset) => asset.key === 'icon');
      return [row.id, asset ? compactItemIcon(asset.value) : ''];
    }),
  );
  const items = await download('item');
  if (!items.length || !icons.size) throw new Error('Refusing an empty Blizzard catalog');
  const missing = [];
  for (const item of items) {
    if (!icons.get(item.id)) {
      // A missing bulk-search entry must not silently become a shared placeholder.
      const row = await request(`media/item/${item.id}`, {});
      if (row.id !== item.id) throw new Error('Blizzard item media identity mismatch');
      const asset = row.assets?.find((asset) => asset.key === 'icon');
      if (asset) icons.set(item.id, compactItemIcon(asset.value));
      else missing.push(item.id);
    }
  }
  if (missing.length)
    onProgress(
      `Blizzard has no icon asset for: ${items
        .filter((item) => missing.includes(item.id))
        .map((item) => `${item.id} (${item.name?.en_US})`)
        .join(', ')}`,
    );
  return items.map((item) => ({ ...item, icon: icons.get(item.id) }));
}
