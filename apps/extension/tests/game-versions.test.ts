import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  activeVersion,
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

test('Era, seasonal and hardcore share Classic pages', () => {
  assert.equal(wowheadContext('/classic/item=12360').group, 'era');
  for (const version of ['era', 'seasonal', 'hardcore'] as const) {
    assert.equal(versionGroup(version), 'era');
  }
  assert.equal(wowheadContext('/classic/item=12360').wowheadBaseUrl, 'https://wowhead.com/classic');
});

test('Forever pages use the Forever realm and link to Forever Wowhead', () => {
  const context = wowheadContext('/forever/item=12360/arcanite-bar');
  assert.equal(context.version, 'forever');
  assert.equal(context.group, 'forever');
  assert.equal(context.isClassic, false);
  assert.equal(context.wowheadBaseUrl, 'https://wowhead.com/forever');
  assert.equal(activeVersion({ forever: 'forever', era: 'seasonal' }, context), 'forever');
  assert.equal(activeVersion(undefined, context), 'forever');
});

test('a stored choice from another Wowhead site is ignored', () => {
  const classic = wowheadContext('/classic/item=12360');
  // Saved before Forever had its own group.
  assert.equal(activeVersion({ era: 'forever' }, classic), 'seasonal');
  assert.equal(activeVersion({ era: 'hardcore' }, classic), 'hardcore');
  assert.equal(activeVersion({}, wowheadContext('/mop-classic/item=1')), 'classic');
});

test('TBC Anniversary has independent realm settings and links', () => {
  assert.equal(versionGroup('anniversary'), 'anniversary');
  const context = wowheadContext('/tbc/item=23445');
  assert.equal(context.group, 'anniversary');
  assert.equal(context.wowheadBaseUrl, 'https://wowhead.com/tbc');
});

test('Forever is selectable from its release date, before any region is chosen', () => {
  assert.equal(isVersionAvailable('forever', foreverReleaseDate - 1), false);
  assert.equal(isVersionAvailable('forever', foreverReleaseDate), true);
  assert.equal(isVersionAvailable('forever', foreverReleaseDate + 86400000), true);
  assert.equal(isVersionAvailable('anniversary', foreverReleaseDate - 1), true);
});
