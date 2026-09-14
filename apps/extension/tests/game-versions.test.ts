import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  foreverRealms,
  foreverReleaseDate,
  isVersionAvailable,
  versionGroup,
  wowheadContext,
} from '../src/utils/gameVersions.ts';

test('progression uses Mists Wowhead pages and links', () => {
  const context = wowheadContext('/mop-classic/item=72092');
  assert.equal(context.group, 'classic');
  assert.equal(context.wowheadBaseUrl, 'https://wowhead.com/mop-classic');
});

test('Era, seasonal, hardcore and Forever share Classic pages', () => {
  assert.equal(wowheadContext('/classic/item=12360').group, 'era');
  for (const version of ['era', 'seasonal', 'hardcore', 'forever'] as const) {
    assert.equal(versionGroup(version), 'era');
  }
  assert.equal(wowheadContext('/classic/item=12360').wowheadBaseUrl, 'https://wowhead.com/classic');
});

test('TBC Anniversary has independent realm settings and links', () => {
  assert.equal(versionGroup('anniversary'), 'anniversary');
  const context = wowheadContext('/tbc/item=23445');
  assert.equal(context.group, 'anniversary');
  assert.equal(context.wowheadBaseUrl, 'https://wowhead.com/tbc');
});

test('Forever unlocks on November 4, 2026 UTC and lists its four realms', () => {
  assert.equal(isVersionAvailable('forever', foreverReleaseDate - 1), false);
  assert.equal(isVersionAvailable('forever', foreverReleaseDate), true);
  assert.equal(isVersionAvailable('anniversary', foreverReleaseDate - 1), true);
  assert.deepEqual(foreverRealms, ['Normal', 'PvP', 'RP', 'Hardcore']);
});
