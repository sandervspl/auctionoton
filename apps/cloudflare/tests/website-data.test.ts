import { env, exports } from 'cloudflare:workers';
import { beforeEach, expect, it, vi } from 'vitest';
import { websiteData } from '../src/website-data';

const data = websiteData(env);
function countedData() {
  const market = vi.fn((sql: string) => env.MARKET.prepare(sql));
  const users = vi.fn((sql: string) => env.USERS.prepare(sql));
  return {
    market,
    users,
    data: websiteData({
      MARKET: { prepare: market, batch: (statements) => env.MARKET.batch(statements) },
      USERS: { prepare: users, batch: (statements) => env.USERS.batch(statements) },
    }),
  };
}
beforeEach(async () => {
  await env.USERS.batch([
    env.USERS.prepare('DELETE FROM website_dashboard_items'),
    env.USERS.prepare('DELETE FROM website_dashboard_sections'),
    env.USERS.prepare('DELETE FROM website_recent_searches'),
  ]);
  await env.MARKET.prepare(`INSERT OR REPLACE INTO item_metadata (id, name, slug)
    VALUES (2589, 'Linen Cloth', 'linen-cloth'), (2592, 'Wool Cloth', 'wool-cloth')`).run();
});

it('searches real names case-insensitively and by ID, with literal wildcards', async () => {
  expect((await data.search('linen'))[0]?.name).toBe('Linen Cloth');
  expect((await data.search('LINEN CLOTH'))[0]?.id).toBe(2589);
  expect((await data.search('2589'))[0]?.slug).toBe('linen-cloth');
  expect(await data.search('%')).toEqual([]);
  expect(await data.search("' OR 1=1 --")).toEqual([]);
  expect(await data.item(999999)).toBeUndefined();
});

it('loads ten recent searches in two database reads, including items with no prices', async () => {
  await env.MARKET.batch(
    Array.from({ length: 10 }, (_, index) =>
      env.MARKET.prepare(
        'INSERT OR REPLACE INTO item_metadata(id,name,slug) VALUES (?, ?, ?)',
      ).bind(10000 + index, `Bulk ${index}`, `bulk-${index}`),
    ),
  );
  await env.USERS.batch(
    Array.from({ length: 10 }, (_, index) =>
      env.USERS.prepare(
        'INSERT INTO website_recent_searches(user_id,item_id,search,timestamp) VALUES (?, ?, ?, ?)',
      ).bind('bulk-user', 10000 + index, 'bulk', new Date().toISOString()),
    ),
  );
  const counted = countedData();
  const results = await counted.data.recentSearches('bulk-user', 519, 'eu');
  expect(results).toHaveLength(10);
  expect(results.every((row) => row.name.startsWith('Bulk') && row.min_buyout === undefined)).toBe(
    true,
  );
  expect(counted.users).toHaveBeenCalledTimes(1);
  expect(counted.market).toHaveBeenCalledTimes(1);
});

it('loads large collections in bounded metadata batches and preserves item ordering', async () => {
  await data.createSection('bulk-owner', 'Bulk');
  const section = (await data.sections('bulk-owner'))[0]!;
  await env.MARKET.batch(
    Array.from({ length: 95 }, (_, index) =>
      env.MARKET.prepare(
        'INSERT OR REPLACE INTO item_metadata(id,name,slug) VALUES (?, ?, ?)',
      ).bind(11000 + index, `Collection ${index}`, `collection-${index}`),
    ),
  );
  await env.USERS.batch(
    Array.from({ length: 95 }, (_, index) =>
      env.USERS.prepare(
        'INSERT INTO website_dashboard_items(section_id,item_id,sort_order) VALUES (?, ?, ?)',
      ).bind(section.id, 11000 + index, 95 - index),
    ),
  );
  const counted = countedData();
  const results = await counted.data.sections('bulk-owner');
  expect(results[0]!.items).toHaveLength(95);
  expect(results[0]!.items[0]!.dashboardSectionItem.itemId).toBe(11094);
  expect(counted.users).toHaveBeenCalledTimes(2);
  expect(counted.market).toHaveBeenCalledTimes(2);
});

it('uses indexed ID and prefix paths while retaining substring and literal-wildcard matches', async () => {
  const counted = countedData();
  expect((await counted.data.search('2589'))[0]?.id).toBe(2589);
  expect(counted.market).toHaveBeenCalledTimes(1);
  await env.MARKET.batch(
    Array.from({ length: 11 }, (_, index) =>
      env.MARKET.prepare(
        'INSERT OR REPLACE INTO item_metadata(id,name,slug) VALUES (?, ?, ?)',
      ).bind(12000 + index, `Needle ${index}`, `needle-${index}`),
    ),
  );
  counted.market.mockClear();
  expect(await counted.data.search('needle')).toHaveLength(10);
  expect(counted.market).toHaveBeenCalledTimes(1);
  const plan = await env.MARKET.prepare(`EXPLAIN QUERY PLAN ${counted.market.mock.calls[0]![0]}`)
    .bind('needle%')
    .all<{ detail: string }>();
  expect(plan.results.some((row) => row.detail.includes('item_metadata_name'))).toBe(true);
  expect((await data.search('inen'))[0]?.name).toBe('Linen Cloth');
  await env.MARKET.prepare(
    "INSERT OR REPLACE INTO item_metadata(id,name,slug) VALUES (12100,'100% Cloth','literal-percent')",
  ).run();
  expect((await data.search('%')).map((row) => row.id)).toEqual([12100]);
});

it('persists repeat searches per owner and handles items without prices', async () => {
  await data.addRecentSearch('alice', { itemId: 2589, search: 'linen' });
  await data.addRecentSearch('alice', { itemId: 2589, search: 'cloth' });
  await data.addRecentSearch('bob', { itemId: 2589, search: 'linen' });
  const alice = await data.recentSearches('alice', 519, 'eu');
  expect(alice).toHaveLength(1);
  expect(alice[0]).toMatchObject({ name: 'Linen Cloth', search: 'cloth', min_buyout: undefined });
  expect((await data.recentSearches('bob', 519, 'eu'))[0]?.search).toBe('linen');
  expect(await data.recentSearches('mallory', 519, 'eu')).toEqual([]);
});

it('creates, reads and deletes collections and items with ownership and cascade checks', async () => {
  await data.createSection('alice', 'Materials');
  const [section] = await data.sections('alice');
  expect(section?.name).toBe('Materials');
  expect(await data.sections('bob')).toEqual([]);
  const id = section!.id;
  await expect(data.addSectionItem('bob', id, 2589)).rejects.toThrow('Collection not found');
  await data.addSectionItem('alice', id, 2589);
  await data.addSectionItem('alice', id, 2589);
  await data.addSectionItem('alice', id, 2592);
  const [populated] = await data.sections('alice');
  expect(populated!.items.map((row) => row.dashboardSectionItem.item.name)).toEqual([
    'Linen Cloth',
    'Wool Cloth',
  ]);
  const itemId = populated!.items[0]!.dashboardSectionItemId;
  await expect(data.deleteSectionItem('bob', id, itemId)).rejects.toThrow(
    'Collection item not found',
  );
  await expect(data.deleteSection('bob', id)).rejects.toThrow('Collection not found');
  await expect(data.addSectionItem('alice', id, 999999)).rejects.toThrow('Item not found');
  await data.deleteSectionItem('alice', id, itemId);
  expect((await data.sections('alice'))[0]!.items).toHaveLength(1);
  await data.deleteSection('alice', id);
  expect(await data.sections('alice')).toEqual([]);
  expect(
    await env.USERS.prepare('SELECT COUNT(*) AS n FROM website_dashboard_items').first('n'),
  ).toBe(0);
});

it('only charts complete recent snapshots for the selected region and excludes pet variants', async () => {
  const now = new Date();
  for (const [suffix, region, status, timestamp, price] of [
    ['one', 'eu', 'complete', new Date(now.getTime() - 86400000).toISOString(), 100],
    ['two', 'eu', 'complete', now.toISOString(), 125],
    ['partial', 'eu', 'writing', now.toISOString(), 999],
    ['us', 'us', 'complete', now.toISOString(), 999],
    ['old', 'eu', 'complete', new Date(now.getTime() - 9 * 86400000).toISOString(), 999],
  ] as const) {
    const id = `website-${suffix}`;
    await env.MARKET.prepare(`INSERT OR REPLACE INTO snapshots
      (snapshot_key, house_key, region, version, auction_house_id, day, status, fetched_at)
      VALUES (?, ?, ?, 'seasonal', 509, ?, ?, ?)`)
      .bind(id, `seasonal-${region}-509`, region, suffix, status, timestamp)
      .run();
    const storageId = await env.MARKET.prepare('SELECT id FROM snapshots WHERE snapshot_key = ?')
      .bind(id)
      .first<number>('id');
    await env.MARKET.prepare(`INSERT OR REPLACE INTO prices
      (snapshot_id, item_id, pet_species_id, min_buyout, quantity, market_value, historical, num_auctions)
      VALUES (?, 2589, 0, ?, 2, 120, 110, 1), (?, 2589, 42, 999, 2, 120, 110, 1)`)
      .bind(storageId, price, storageId)
      .run();
  }
  const history = await data.history(2589, 509, 'eu');
  expect(history.map((row) => row.minBuyout)).toEqual([100, 125]);
  expect(history[0]?.timestamp).toBeInstanceOf(Date);
  await data.addRecentSearch('alice', { itemId: 2589, search: 'linen' });
  expect((await data.recentSearches('alice', 509, 'eu'))[0]).toMatchObject({
    min_buyout: 125,
    diffMinBuyout: 25,
  });
});

it('expands item-specific icon tokens across search, item reads, collections, and the public API', async () => {
  await env.MARKET.prepare(
    "UPDATE item_metadata SET icon='inv_fabric_linen_01' WHERE id=2589",
  ).run();
  const expected =
    'https://render.worldofwarcraft.com/classic1x-eu/icons/56/inv_fabric_linen_01.jpg';
  expect((await data.item(2589))?.icon).toBe(expected);
  expect((await data.search('linen'))[0]?.icon).toBe(expected);
  await data.createSection('icons-user', 'Materials');
  const section = (await data.sections('icons-user'))[0]!;
  await data.addSectionItem('icons-user', section.id, 2589);
  expect((await data.sections('icons-user'))[0]!.items[0]!.dashboardSectionItem.item.icon).toBe(
    expected,
  );
  const id = await env.MARKET.prepare(`INSERT INTO snapshots
    (snapshot_key,house_key,region,version,auction_house_id,day,status,fetched_at)
    VALUES ('icon-test','seasonal-eu-999','eu','seasonal',999,'2026-09-14','complete','2026-09-14T04:00:00Z') RETURNING id`).first<number>(
    'id',
  );
  await env.MARKET.batch([
    env.MARKET.prepare('INSERT INTO prices VALUES (?,2589,0,100,1,100,100,1)').bind(id),
    env.MARKET.prepare(
      "INSERT INTO published_houses VALUES ('seasonal-eu-999',?,'2026-09-14')",
    ).bind(id),
  ]);
  const response = await exports.default.fetch(
    'https://trial.example.com/item/2589/ah/999/seasonal',
  );
  expect(await response.json()).toMatchObject({ name: 'Linen Cloth', icon: expected });
});
