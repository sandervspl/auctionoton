import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createSearchEngine, decodeIndex } from '../src/index.ts';
import { goldenQueries, goldenSynonyms } from './golden-queries.ts';

// The website budgets 50 ms from keystroke to paint; matching gets at most 5 ms of it on CI,
// leaving the rest for React and the browser on slower devices.
const MATCH_BUDGET_MS = 5;

const file = JSON.parse(
  readFileSync(new URL('./fixtures/era-index.json', import.meta.url), 'utf8'),
);
const { items } = decodeIndex(file);

it('builds an engine for a full index quickly', () => {
  const started = performance.now();
  createSearchEngine(items, goldenSynonyms);
  expect(performance.now() - started).toBeLessThan(200);
});

it(`matches every keystroke within ${MATCH_BUDGET_MS} ms at p95`, () => {
  const engine = createSearchEngine(items, goldenSynonyms);
  // Every prefix of golden queries and of 1,000 item names, as a player would type them.
  const queries = new Set<string>();
  const typed = (text: string) => {
    for (let length = 1; length <= text.length; length++) queries.add(text.slice(0, length));
  };
  for (const golden of goldenQueries) typed(golden.query);
  for (let index = 0; index < items.length; index += Math.ceil(items.length / 1000))
    typed(items[index]!.name.toLowerCase());
  for (const query of queries) engine.search(query); // warm up the JIT
  const timings = [...queries].map((query) => {
    const started = performance.now();
    engine.search(query);
    return performance.now() - started;
  });
  timings.sort((a, b) => a - b);
  const p95 = timings[Math.floor(timings.length * 0.95)]!;
  console.info(
    `${timings.length} queries: p50 ${timings[Math.floor(timings.length / 2)]!.toFixed(3)} ms, p95 ${p95.toFixed(3)} ms, max ${timings.at(-1)!.toFixed(3)} ms`,
  );
  expect(p95).toBeLessThan(MATCH_BUDGET_MS);
});
