import { env } from 'cloudflare:workers';
import { runInDurableObject } from 'cloudflare:test';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import worker from '../src/index';
import { versions, providerVersions } from '../src/contracts';
import { parseRealmCatalog, realmCatalogLifetime, selectRealmRegion } from '../src/realms';
import { discoverHouseJobs } from '../src/discovery';
import { PUBLIC_CACHE_CONTROL } from '../src/public-cache';

const realm = (name: string, realmId: number) => ({
  name,
  localizedName: name,
  realmId,
  locale: 'en_US',
  auctionHouses: [{ auctionHouseId: realmId + 500, type: 'Alliance', lastModified: 0 }],
});
const catalog = {
  items: versions.flatMap((version) =>
    ['eu', 'us'].map((regionPrefix) => ({
      regionPrefix,
      gameVersion: providerVersions[version],
      realms: [realm(`${regionPrefix} Zulu`, 2), realm(`${regionPrefix} Alpha`, 1)],
    })),
  ),
};

beforeEach(async () => {
  await env.SNAPSHOTS.delete('realm-cache/v1/catalog.json');
  // The expiry test advances time; reset its persisted provider throttle as well.
  await runInDurableObject(env.PROVIDER.getByName('tsm-seasonal'), (_instance, state) => {
    state.storage.sql.exec('DELETE FROM throttle');
    state.storage.sql.exec('DELETE FROM tokens');
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockProvider(data: unknown = catalog, status = 200) {
  const fetcher = vi.fn(async (url: string) =>
    url.includes('/oauth2/token')
      ? Response.json({ access_token: 'realm-test-token', expires_in: 3600 })
      : Response.json(data, { status }),
  );
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
const request = (path: string) =>
  worker.fetch(
    new Request(`https://trial.example.com${path}`, {
      headers: { Origin: 'chrome-extension://test' },
    }),
    env,
  );

it('serves sorted realms and provider auction-house IDs for every region/version with CORS', async () => {
  const fetcher = mockProvider();
  const bindings = { ...env, TSM_API_KEY_B: '', TSM_API_KEY_C: '', TSM_API_KEY_D: '' };
  for (const version of versions) {
    for (const region of ['eu', 'us']) {
      const response = await worker.fetch(
        new Request(`https://trial.example.com/realms/${region}/${version}`, {
          headers: { Origin: 'chrome-extension://test' },
        }),
        bindings,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Cache-Control')).toBe(PUBLIC_CACHE_CONTROL);
      expect(response.headers.get('Cache-Tag')).toBe('realm-catalog');
      expect(await response.json()).toEqual([
        expect.objectContaining({
          name: `${region} Alpha`,
          auctionHouses: [{ auctionHouseId: 501, type: 'Alliance', lastModified: 0 }],
        }),
        expect.objectContaining({ name: `${region} Zulu` }),
      ]);
    }
  }
  expect(fetcher.mock.calls.filter(([url]) => url.includes('realm-api'))).toHaveLength(1);
});

it('reuses a fresh catalog and fetches newly added realms after one hour without an import job', async () => {
  const fetcher = mockProvider();
  await request('/realms/eu/seasonal');
  await request('/realms/us/seasonal');
  expect(fetcher.mock.calls.filter(([url]) => url.includes('realm-api'))).toHaveLength(1);
  const now = Date.now();
  vi.spyOn(Date, 'now').mockReturnValue(now + realmCatalogLifetime + 1000);
  mockProvider({
    items: [
      { regionPrefix: 'eu', gameVersion: 'Season of Discovery', realms: [realm('New realm', 3)] },
    ],
  });
  const response = await request('/realms/eu/seasonal');
  expect(await response.json()).toEqual([expect.objectContaining({ name: 'New realm' })]);
});

it('reports provider errors and malformed catalogs as retryable failures without caching them', async () => {
  mockProvider({ error: 'upstream unavailable' }, 503);
  let response = await request('/realms/eu/era');
  expect(response.status).toBe(503);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  expect(await env.SNAPSHOTS.head('realm-cache/v1/catalog.json')).toBeNull();
  mockProvider({ items: [{ regionPrefix: 'eu', gameVersion: 'Classic Era', realms: [{}] }] });
  response = await request('/realms/eu/era');
  expect(response.status).toBe(503);
  expect(await env.SNAPSHOTS.head('realm-cache/v1/catalog.json')).toBeNull();
});

it('distinguishes a valid empty list from missing version mappings and invalid requests', async () => {
  mockProvider({ items: [{ regionPrefix: 'eu', gameVersion: 'Classic Era', realms: [] }] });
  const empty = await request('/realms/eu/era');
  expect(empty.status).toBe(200);
  expect(await empty.json()).toEqual([]);
  expect((await request('/realms/us/era')).status).toBe(503);
  expect((await request('/realms/eu/retail')).status).toBe(400);
  expect((await request('/realms/xx/era')).status).toBe(400);
});

it('keeps legacy progression labels and prefers a renamed expansion without guessing unknown modes', () => {
  const items = parseRealmCatalog(catalog).items;
  expect(selectRealmRegion(items, 'eu', 'classic').gameVersion).toBe('Wrath');
  items.push({ regionPrefix: 'eu', gameVersion: 'Mists of Pandaria', realms: [] });
  expect(selectRealmRegion(items, 'eu', 'classic').gameVersion).toBe('Mists of Pandaria');
  expect(() =>
    selectRealmRegion(
      [{ regionPrefix: 'eu', gameVersion: 'Unknown', realms: [] }],
      'eu',
      'classic',
    ),
  ).toThrow('No provider realm catalog');
});

it('rejects auction houses that the extension cannot parse before caching them', async () => {
  const broken = realm('Invalid timestamp', 1);
  mockProvider({
    items: [
      {
        regionPrefix: 'eu',
        gameVersion: 'Classic Era',
        realms: [
          {
            ...broken,
            auctionHouses: [{ auctionHouseId: 501, type: 'Alliance', lastModified: 'yesterday' }],
          },
        ],
      },
    ],
  });
  expect((await request('/realms/eu/era')).status).toBe(503);
  expect(await env.SNAPSHOTS.head('realm-cache/v1/catalog.json')).toBeNull();
});

it('uses the same progression mapping for price imports and realm selection', () => {
  const catalog = {
    items: [
      {
        regionPrefix: 'eu' as const,
        gameVersion: 'Mists of Pandaria',
        realms: [realm('Progression', 1)],
      },
    ],
  };
  const jobs = discoverHouseJobs(catalog, [
    { region: 'eu', version: 'classic', auctionHouseId: 501, day: '2026-09-14' },
  ]);
  expect(jobs).toHaveLength(1);
  expect(jobs[0].auctionHouseId).toBe(501);
});
