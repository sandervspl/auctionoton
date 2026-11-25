import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import worker from '../src/index';
import { versions } from '../src/contracts';
import {
  auctionHouseCsvUrl,
  getRealms,
  realmCatalog,
  validateRealmCatalog,
  type RealmCatalog,
} from '../src/realms';
import { discoverHouseJobs } from '../src/discovery';
import { PUBLIC_CACHE_CONTROL } from '../src/public-cache';

const request = (path: string) =>
  worker.fetch(
    new Request(`https://trial.example.com${path}`, {
      headers: { Origin: 'chrome-extension://test' },
    }),
    env,
  );

it('ships a valid catalog with realms for every supported region and version', () => {
  expect(() => validateRealmCatalog(realmCatalog)).not.toThrow();
  for (const version of versions) {
    for (const region of ['eu', 'us'] as const) {
      expect(realmCatalog[version][region].realms.length, `${version}/${region}`).toBeGreaterThan(
        0,
      );
    }
  }
});

it('serves sorted realms and auction-house IDs for every region/version with CORS', async () => {
  for (const version of versions) {
    for (const region of ['eu', 'us']) {
      const response = await request(`/realms/${region}/${version}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Cache-Control')).toBe(PUBLIC_CACHE_CONTROL);
      expect(response.headers.get('Cache-Tag')).toBe('realm-catalog');
      const realms = (await response.json()) as ReturnType<typeof getRealms>;
      const names = realms.map((realm) => realm.localizedName);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      for (const realm of realms) {
        expect(realm.auctionHouses.length).toBeGreaterThan(0);
        expect(Object.keys(realm.auctionHouses[0]!).sort()).toEqual(['auctionHouseId', 'type']);
      }
    }
  }
});

it('rejects unknown regions and versions', async () => {
  expect((await request('/realms/eu/retail')).status).toBe(400);
  expect((await request('/realms/xx/era')).status).toBe(400);
});

it('lists every Forever realm in both regions', () => {
  for (const region of ['eu', 'us'] as const) {
    expect(getRealms(region, 'forever').map((realm) => realm.name)).toEqual([
      'Normal',
      'PvP',
      'Roleplay',
      'Roleplay PvP',
    ]);
  }
});

it('keeps Anniversary realms separate from Era and progression', () => {
  expect(getRealms('eu', 'anniversary').map((realm) => realm.name)).toEqual([
    'Spineshatter',
    'Thunderstrike',
  ]);
  expect(getRealms('us', 'anniversary').map((realm) => realm.name)).toEqual([
    'Dreamscythe',
    'Maladath (AU)',
    'Nightslayer',
  ]);
});

it('maps auction houses to TSM public CSV files by version, region, realm and faction', () => {
  expect(auctionHouseCsvUrl({ region: 'eu', version: 'seasonal', auctionHouseId: 509 })).toBe(
    'https://public-data.tradeskillmaster.com/classic/eu-sod/realm/wild-growth-alliance/items.csv',
  );
  expect(auctionHouseCsvUrl({ region: 'us', version: 'forever', auctionHouseId: 598 })).toBe(
    'https://public-data.tradeskillmaster.com/forever/us/realm/roleplay-pvp-horde/items.csv',
  );
  expect(auctionHouseCsvUrl({ region: 'us', version: 'anniversary', auctionHouseId: 551 })).toBe(
    'https://public-data.tradeskillmaster.com/classic/us-fresh/realm/maladath-au-alliance/items.csv',
  );
  // The same house ID in another region or version is a different market.
  expect(auctionHouseCsvUrl({ region: 'us', version: 'seasonal', auctionHouseId: 509 })).toBe(
    undefined,
  );
  expect(auctionHouseCsvUrl({ region: 'eu', version: 'era', auctionHouseId: 509 })).toBe(undefined);
});

it('uses the first connected realm for a shared auction house', () => {
  const catalog = {
    era: {
      eu: {
        path: 'classic/eu',
        realms: [
          {
            name: 'First',
            localizedName: 'First',
            realmId: 1,
            slug: 'first',
            auctionHouses: [{ auctionHouseId: 7, type: 'Horde' }],
          },
          {
            name: 'Second',
            localizedName: 'Second',
            realmId: 2,
            slug: 'second',
            auctionHouses: [{ auctionHouseId: 7, type: 'Horde' }],
          },
        ],
      },
    },
  } as unknown as RealmCatalog;
  expect(auctionHouseCsvUrl({ region: 'eu', version: 'era', auctionHouseId: 7 }, catalog)).toBe(
    'https://public-data.tradeskillmaster.com/classic/eu/realm/first-horde/items.csv',
  );
});

it('validates catalog slugs, IDs, factions and shared houses', () => {
  const entry = (realms: unknown[]) => ({ era: { eu: { path: 'classic/eu', realms } } });
  const realm = {
    name: 'One',
    localizedName: 'One',
    realmId: 1,
    slug: 'one',
    auctionHouses: [{ auctionHouseId: 1, type: 'Alliance' }],
  };
  expect(() => validateRealmCatalog(entry([realm]))).not.toThrow();
  expect(() => validateRealmCatalog(entry([{ ...realm, slug: 'Bad Slug' }]))).toThrow();
  expect(() => validateRealmCatalog(entry([{ ...realm, realmId: 0 }]))).toThrow();
  expect(() =>
    validateRealmCatalog(
      entry([{ ...realm, auctionHouses: [{ auctionHouseId: 1, type: 'All' }] }]),
    ),
  ).toThrow();
  expect(() =>
    validateRealmCatalog(
      entry([realm, { ...realm, auctionHouses: [{ auctionHouseId: 1, type: 'Horde' }] }]),
    ),
  ).toThrow('Conflicting');
});

it('rejects configured houses that the catalog cannot map', () => {
  const job = { region: 'eu', version: 'classic', day: '2026-09-14' } as const;
  const progression = realmCatalog.classic.eu.realms[0]!.auctionHouses[0]!.auctionHouseId;
  expect(discoverHouseJobs([{ ...job, auctionHouseId: progression }])).toHaveLength(1);
  expect(() => discoverHouseJobs([{ ...job, auctionHouseId: 999_999 }])).toThrow('absent');
});
