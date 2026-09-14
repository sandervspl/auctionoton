import { env } from 'cloudflare:workers';
import { beforeEach, expect, it } from 'vitest';
import { websiteData } from '../src/website-data';

const data = websiteData(env);
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
      (id, house_key, region, version, auction_house_id, day, status, fetched_at)
      VALUES (?, ?, ?, 'seasonal', 509, ?, ?, ?)`)
      .bind(id, id, region, suffix, status, timestamp)
      .run();
    await env.MARKET.prepare(`INSERT OR REPLACE INTO prices
      (snapshot_id, item_id, pet_species_id, min_buyout, quantity, market_value, historical, num_auctions)
      VALUES (?, 2589, 0, ?, 2, 120, 110, 1), (?, 2589, 42, 999, 2, 120, 110, 1)`)
      .bind(id, price, id)
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
