import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createSearchEngine, decodeIndex } from '../src/index.ts';
import { goldenQueries, goldenSynonyms } from './golden-queries.ts';

const file = JSON.parse(
  readFileSync(new URL('./fixtures/era-index.json', import.meta.url), 'utf8'),
);
const engine = createSearchEngine(decodeIndex(file).items, goldenSynonyms);

describe('golden queries', () => {
  for (const golden of goldenQueries) {
    it(`"${golden.query}": ${golden.why}`, () => {
      const hits = engine.search(golden.query);
      const names = hits.map((hit) => hit.name);
      if (golden.empty) expect(names).toEqual([]);
      if (golden.top) expect(names.slice(0, golden.top.length)).toEqual(golden.top);
      if (golden.last) expect(names[9]).toBe(golden.last);
      for (const name of golden.includes ?? []) expect(names).toContain(name);
      for (const name of golden.excludes ?? []) expect(names).not.toContain(name);
      if (golden.reason) expect(hits[0]?.reason).toBe(golden.reason);
      if (golden.highlights) expect(hits[0]?.highlights).toEqual(golden.highlights);
    });
  }

  it('highlights the earliest word with the matched prefix', () => {
    const bronze = engine.search('b').find((hit) => hit.name === 'Bronze Bar');
    expect(bronze?.highlights).toEqual([[0, 1]]);
  });
});
