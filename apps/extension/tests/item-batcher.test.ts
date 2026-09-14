import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createItemBatcher } from '../src/utils/itemBatcher.ts';
import type { ItemMarket } from '../src/utils/itemCache.ts';

const market: ItemMarket = { region: 'eu', version: 'seasonal', auctionHouseId: 509 };
test('coalesces 30 item requests into one sorted batch and resolves individual results', async () => {
  const calls: number[][] = [];
  const load = createItemBatcher(async (ids) => {
    calls.push(ids);
    return new Map(ids.map((id) => [id, id * 10]));
  }, 0);
  const ids = Array.from({ length: 30 }, (_, index) => 30 - index);
  assert.deepEqual(
    await Promise.all(ids.map((id) => load(id, market))),
    ids.map((id) => id * 10),
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(
    calls[0],
    [...ids].sort((a, b) => a - b),
  );
});
test('deduplicates item IDs, caps each request at 50 and isolates markets', async () => {
  const calls: { ids: number[]; market: ItemMarket }[] = [];
  const load = createItemBatcher(async (ids, market) => {
    calls.push({ ids, market });
    return new Map(ids.map((id) => [id, id]));
  }, 0);
  await Promise.all([
    ...Array.from({ length: 101 }, (_, index) => load(index + 1, market)),
    load(1, market),
    load(1, { ...market, version: 'era' }),
    load(1, { ...market, region: 'us' }),
  ]);
  assert.equal(calls.length, 5);
  assert.ok(calls.every((call) => call.ids.length <= 50));
  assert.equal(
    calls.filter((call) => call.market === market).flatMap((call) => call.ids).length,
    101,
  );
});
test('abandoning a queued request prevents its HTTP call', async () => {
  let calls = 0;
  const load = createItemBatcher(async () => {
    calls++;
    return new Map();
  }, 0);
  const controller = new AbortController();
  const request = load(1, market, controller.signal);
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls, 0);
});
test('one cancelled consumer does not abort the shared batch; cancelling all does', async () => {
  let batchSignal: AbortSignal;
  let finish: (result: Map<number, number>) => void;
  let started: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const load = createItemBatcher<number>(async (_ids, _market, signal) => {
    batchSignal = signal;
    started();
    return new Promise((resolve) => {
      finish = resolve;
    });
  }, 0);
  const first = new AbortController();
  const second = new AbortController();
  const a = load(1, market, first.signal);
  const b = load(2, market, second.signal);
  await ready;
  first.abort();
  await assert.rejects(a, { name: 'AbortError' });
  assert.equal(batchSignal!.aborted, false);
  second.abort();
  await assert.rejects(b, { name: 'AbortError' });
  assert.equal(batchSignal!.aborted, true);
  finish!(new Map());
});
test('missing items fail individually and transport failures reach every consumer', async () => {
  const load = createItemBatcher(async () => new Map([[1, 100]]), 0);
  const results = await Promise.allSettled([load(1, market), load(2, market)]);
  assert.deepEqual(results[0], { status: 'fulfilled', value: 100 });
  assert.equal(results[1].status, 'rejected');
  const broken = createItemBatcher(async () => {
    throw new Error('Unavailable');
  }, 0);
  const failures = await Promise.allSettled([broken(1, market), broken(2, market)]);
  assert.ok(
    failures.every(
      (result) => result.status === 'rejected' && result.reason.message === 'Unavailable',
    ),
  );
});
