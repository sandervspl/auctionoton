import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRealms, selectRealm } from '../src/utils/realms.ts';

const realms = [
  {
    name: 'Wild Growth',
    localizedName: 'Wild Growth',
    realmId: 1,
    auctionHouses: [{ auctionHouseId: 509, type: 'Alliance', lastModified: 0 }],
  },
  {
    name: 'Living Flame',
    localizedName: 'Living Flame',
    realmId: 2,
    auctionHouses: [{ auctionHouseId: 511, type: 'Alliance', lastModified: 0 }],
  },
];

test('accepts realm arrays and legacy stringified arrays, including empty catalogs', () => {
  assert.deepEqual(parseRealms(realms), realms);
  assert.deepEqual(parseRealms(JSON.stringify(realms)), realms);
  assert.deepEqual(parseRealms([]), []);
});

test('does not turn deployment errors or malformed responses into empty successes', () => {
  for (const value of ['DEPLOYMENT_NOT_FOUND', { error: true }, null, {}, [{ name: 'Broken' }]]) {
    assert.throws(() => parseRealms(value));
  }
});

test('preserves a user selection when realms refresh', () => {
  assert.equal(
    selectRealm(realms, 'Living Flame', { name: 'Wild Growth', auctionHouseId: 509 }),
    'Living Flame',
  );
});

test('restores only a saved realm belonging to the returned auction house catalog', () => {
  assert.equal(
    selectRealm(realms, '', { name: 'Living Flame', auctionHouseId: 511 }),
    'Living Flame',
  );
  assert.equal(
    selectRealm(realms, '', { name: 'Living Flame', auctionHouseId: 999 }),
    'Wild Growth',
  );
  assert.equal(selectRealm(realms, 'Removed realm'), 'Wild Growth');
  assert.equal(selectRealm([], 'Removed realm'), '');
});
