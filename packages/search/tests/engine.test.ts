import { describe, expect, it } from 'vitest';
import {
  createSearchEngine,
  decodeIndex,
  encodeIndex,
  normalizePhrase,
  prefixDistance,
  slugify,
  tokenize,
  type SearchItem,
} from '../src/index.ts';

const item = (id: number, name: string, extra: Partial<SearchItem> = {}): SearchItem => ({
  id,
  name,
  slug: slugify(name),
  icon: '',
  quality: 1,
  type: null,
  popularity: 0,
  ...extra,
});

describe('tokenize', () => {
  it('joins apostrophes, splits punctuation and folds accents', () => {
    expect(tokenize("Crusader's Shield").map((token) => token.text)).toEqual([
      'crusaders',
      'shield',
    ]);
    expect(normalizePhrase('Formula: Enchant Weapon - Crusader')).toBe(
      'formula enchant weapon crusader',
    );
    expect(normalizePhrase('Mâgic Ëssence')).toBe('magic essence');
  });

  it('maps every word character back to its source position', () => {
    const [first] = tokenize("Crusader's");
    expect(first?.positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 9]);
  });
});

describe('prefixDistance', () => {
  it('measures typos against the closest word prefix', () => {
    expect(prefixDistance('black', 'black', 1)).toBe(0);
    expect(prefixDistance('balck', 'black', 1)).toBe(1);
    expect(prefixDistance('arcanit', 'arcanite', 1)).toBe(0);
    expect(prefixDistance('thoruim', 'thorium', 1)).toBe(1);
    expect(prefixDistance('copper', 'dreamfoil', 2)).toBe(3);
  });
});

describe('index format', () => {
  it('round-trips items, slugs that differ from their name and synonyms', () => {
    const items = [
      item(20, 'Black Lotus', {
        icon: 'inv_misc_herb_blacklotus',
        quality: 2,
        type: 'Herb',
        popularity: 70,
      }),
      item(5, 'Old Name', { slug: 'renamed-item' }),
      item(9, 'Linen Cloth', { type: 'Cloth' }),
    ];
    const synonyms = {
      items: [{ term: 'bl', itemIds: [20] }],
      words: [{ term: 'pot', expansion: 'potion' }],
    };
    const file = encodeIndex('era', '2026-11-27T00:00:00.000Z', items, synonyms);
    expect(file.idDeltas).toEqual([5, 4, 11]);
    expect(file.slugs).toEqual({ 5: 'renamed-item' });
    const decoded = decodeIndex(JSON.parse(JSON.stringify(file)));
    expect(decoded.items).toEqual([...items].sort((a, b) => a.id - b.id));
    expect(decoded.synonyms).toEqual(synonyms);
  });

  it('rejects duplicate ids', () => {
    expect(() =>
      encodeIndex('era', '', [item(1, 'A'), item(1, 'B')], { items: [], words: [] }),
    ).toThrow();
  });
});

describe('search', () => {
  const engine = createSearchEngine(
    [item(1, 'Mana Potion', { popularity: 1 }), item(2, 'Major Mana Potion', { popularity: 9 })],
    { items: [{ term: 'mmp', itemIds: [2, 404] }], words: [] },
  );

  it('ignores empty queries and limits results', () => {
    expect(engine.search('  ')).toEqual([]);
    expect(engine.search('mana', 1)).toHaveLength(1);
  });

  it('pins item synonyms and drops ids missing from the index', () => {
    expect(engine.search('mmp').map((hit) => [hit.id, hit.reason])).toEqual([[2, 'synonym']]);
  });

  it('highlights the earliest word with the matched prefix', () => {
    const bars = createSearchEngine([item(1, 'Bronze Bar')], { items: [], words: [] });
    expect(bars.search('b')[0]?.highlights).toEqual([[0, 1]]);
  });

  it('looks items up by id', () => {
    expect(engine.get(2)?.name).toBe('Major Mana Potion');
    expect(engine.search('1')[0]).toMatchObject({ id: 1, reason: 'id' });
  });
});
