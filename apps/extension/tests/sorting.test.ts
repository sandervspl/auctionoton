import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortBuyoutRows } from '../src/utils/sortBuyoutRows.ts';

const rows = (prices: Array<number | string>) =>
  prices.map((price) => ({ dataset: { buyoutRaw: String(price) } }));
test('sorts already sorted rows, reversed 33-row lists and large lists without a loop limit', () => {
  for (const count of [2, 33, 1000]) {
    const ascending = rows(Array.from({ length: count }, (_, index) => index + 1));
    assert.deepEqual(sortBuyoutRows(ascending, 'asc'), ascending);
    assert.deepEqual(sortBuyoutRows([...ascending].reverse(), 'asc'), ascending);
    assert.deepEqual(sortBuyoutRows(ascending, 'desc'), [...ascending].reverse());
  }
});
test('preserves row identity and equal-price order; unavailable prices stay last in both directions', () => {
  const input = rows(['', 3, 'NaN', 1, 3, 0]);
  assert.deepEqual(sortBuyoutRows(input, 'asc'), [
    input[3],
    input[1],
    input[4],
    input[0],
    input[2],
    input[5],
  ]);
  assert.deepEqual(sortBuyoutRows(input, 'desc'), [
    input[1],
    input[4],
    input[3],
    input[0],
    input[2],
    input[5],
  ]);
  assert.deepEqual(sortBuyoutRows([], 'asc'), []);
});
