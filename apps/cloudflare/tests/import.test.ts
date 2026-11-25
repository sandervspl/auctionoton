import { introspectWorkflowInstance } from 'cloudflare:test';
import { env, exports } from 'cloudflare:workers';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { snapshotId } from '../src/contracts';
import type { AuctionJob, Price } from '../src/contracts';
import { CsvParser } from '../src/csv';
import {
  archiveHouse,
  beginSnapshot,
  normalizeArchive,
  publishSnapshot,
  snapshotStorageId,
  writeChunk,
} from '../src/storage';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-14T12:00:00Z'));
});
afterAll(() => vi.useRealTimers());
afterEach(() => vi.unstubAllGlobals());

const job = (day: string): AuctionJob => ({
  region: 'eu',
  version: 'seasonal',
  auctionHouseId: 509,
  day,
});
const item = (itemId: number, price = 100): Price => ({
  auctionHouseId: 509,
  itemId,
  minBuyout: price,
  marketValue: 120,
  historical: 110,
});
const header = 'itemId,name,marketValue,minBuyout,recent,historical,updatedAt';
const csv = (rows: Price[]) =>
  [
    header,
    ...rows.map(
      (row) =>
        `${row.itemId},"Item ""${row.itemId}"", test",${row.marketValue},${row.minBuyout},0,${row.historical},2026-09-14T04:00:00Z`,
    ),
  ].join('\n');
async function seedArchive(job: AuctionJob, data: Price[] | string) {
  const rawKey = `raw/${snapshotId(job)}.csv`;
  const fetchedAt = `${job.day}T04:00:00.000Z`;
  const body = typeof data === 'string' ? data : csv(data);
  await env.SNAPSHOTS.put(rawKey, body, { customMetadata: { fetchedAt } });
  return {
    rawKey,
    fetchedAt,
    providerModifiedAt: null,
    bytes: new TextEncoder().encode(body).length,
  };
}
async function importDirect(job: AuctionJob, rows: Price[] | string) {
  await beginSnapshot(env.MARKET, job);
  const archive = await seedArchive(job, rows);
  const manifest = await normalizeArchive(env, job, archive);
  for (let index = 0; index < manifest.chunks; index++) await writeChunk(env, job, index);
  return publishSnapshot(env.MARKET, job, manifest);
}
async function readPrice() {
  const response = await exports.default.fetch(
    'https://trial.example.com/item/123/ah/509/seasonal',
  );
  return response.json() as Promise<{
    error?: boolean;
    stats: { lastUpdated: string; current: { minBuyout: number } };
  }>;
}

describe('atomic daily snapshots', () => {
  it('keeps the last complete price visible through partial writes and duplicate retries', async () => {
    await importDirect(job('2026-09-01'), [item(123, 100)]);
    const next = job('2026-09-02');
    await beginSnapshot(env.MARKET, next);
    const archive = await seedArchive(
      next,
      Array.from({ length: 501 }, (_, i) => item(123 + i, 200)),
    );
    const manifest = await normalizeArchive(env, next, archive);
    expect(manifest.chunks).toBe(2);
    await writeChunk(env, next, 0);
    await writeChunk(env, next, 0);
    expect((await readPrice()).stats.current.minBuyout).toBe(100);
    await expect(publishSnapshot(env.MARKET, next, manifest)).rejects.toThrow('row count mismatch');
    await writeChunk(env, next, 1);
    await publishSnapshot(env.MARKET, next, manifest);
    const current = await readPrice();
    expect(current.stats.current.minBuyout).toBe(200);
    expect(current.stats.lastUpdated).toBe('2026-09-02T04:00:00.000Z');
    expect(await beginSnapshot(env.MARKET, next)).toBe(false);
    const count = await env.MARKET.prepare('SELECT COUNT(*) AS n FROM prices WHERE snapshot_id = ?')
      .bind(await snapshotStorageId(env.MARKET, next))
      .first<{ n: number }>();
    expect(count?.n).toBe(501);
  });

  it('does not let an older job replace a newer published snapshot', async () => {
    await importDirect(job('2026-09-04'), [item(123, 400)]);
    await importDirect(job('2026-09-03'), [item(123, 300)]);
    expect((await readPrice()).stats.current.minBuyout).toBe(400);
  });

  it('publishes a verified empty file', async () => {
    await importDirect(job('2026-09-06'), []);
    expect((await readPrice()).error).toBe(true);
  });

  it('reads columns by header name and accepts CRLF and a missing trailing newline', async () => {
    const reordered = job('2026-09-07');
    await importDirect(
      reordered,
      ['historical,minBuyout,itemId,marketValue', '7,8,123,9', '1,2,124,3'].join('\r\n'),
    );
    const rows = await env.MARKET.prepare(
      'SELECT item_id, min_buyout, market_value, historical FROM prices WHERE snapshot_id = ? ORDER BY item_id',
    )
      .bind(await snapshotStorageId(env.MARKET, reordered))
      .all();
    expect(rows.results).toEqual([
      { item_id: 123, min_buyout: 8, market_value: 9, historical: 7 },
      { item_id: 124, min_buyout: 2, market_value: 3, historical: 1 },
    ]);
  });

  it.each([
    'not,a,tsm,file\n1,2,3,4',
    `${header}\n123,Item,1,${Number.MAX_SAFE_INTEGER + 1},0,1,2026-09-14T04:00:00Z`,
    `${header}\n123,Item,1,-5,0,1,2026-09-14T04:00:00Z`,
    `${header}\n123,Item,1,2,0,1,x\n123,Item,1,2,0,1,x`,
    `${header}\n123,"Unterminated,1,2,0,1,x`,
    '',
  ])('rejects malformed or unsafe provider data', async (data) => {
    const badJob = job('2026-08-01');
    const archive = await seedArchive(badJob, data);
    await expect(normalizeArchive(env, badJob, archive)).rejects.toThrow();
  });

  it('downloads the house CSV from the catalog URL and archives it once', async () => {
    const fetched: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        fetched.push(url);
        return new Response(csv([item(123, 5)]), {
          headers: { 'Last-Modified': 'Mon, 14 Sep 2026 03:00:00 GMT' },
        });
      }),
    );
    const archiveJob = job('2026-09-08');
    const archive = await archiveHouse(env, archiveJob);
    expect(fetched).toEqual([
      'https://public-data.tradeskillmaster.com/classic/eu-sod/realm/wild-growth-alliance/items.csv',
    ]);
    expect(archive).toMatchObject({
      rawKey: 'raw/seasonal-eu-509-2026-09-08.csv',
      providerModifiedAt: '2026-09-14T03:00:00.000Z',
    });
    expect(await archiveHouse(env, archiveJob)).toEqual(archive);
    expect(fetched).toHaveLength(1);
    const manifest = await normalizeArchive(env, archiveJob, archive);
    expect(manifest.rows).toBe(1);
  });

  it('fails visibly on provider errors and uncatalogued houses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('missing', { status: 404 })),
    );
    await expect(archiveHouse(env, job('2026-09-09'))).rejects.toThrow('HTTP 404');
    await expect(
      archiveHouse(env, { ...job('2026-09-09'), auctionHouseId: 999_999 }),
    ).rejects.toThrow('absent from the realm catalog');
  });

  it('runs a real Workflow, retries a failed D1 step, and reuses R2 on duplicate delivery', async () => {
    const retryJob = job('2026-09-10');
    const id = snapshotId(retryJob);
    await seedArchive(retryJob, [item(123, 1000)]);
    await using workflow = await introspectWorkflowInstance(env.AUCTION_IMPORT, id);
    await workflow.modify(async (modifier) => {
      await modifier.disableRetryDelays();
      await modifier.mockStepError({ name: 'write-chunk-0' }, new Error('Transient D1 failure'), 1);
      await modifier.mockStepError(
        { name: 'invalidate-price-cache' },
        new Error('Transient cache failure'),
        1,
      );
    });
    await env.AUCTION_IMPORT.createBatch([{ id, params: retryJob }]);
    await workflow.waitForStatus('complete');
    expect((await readPrice()).stats.current.minBuyout).toBe(1000);
    await env.AUCTION_IMPORT.createBatch([{ id, params: retryJob }]);
    const stored = await env.MARKET.prepare(
      'SELECT COUNT(*) AS n FROM prices WHERE snapshot_id = ?',
    )
      .bind(await snapshotStorageId(env.MARKET, retryJob))
      .first<{ n: number }>();
    expect(stored?.n).toBe(1);
    expect((await readPrice()).stats.lastUpdated).toBe('2026-09-10T04:00:00.000Z');
  });
});

describe('CSV parser', () => {
  it('handles quotes, escaped quotes, embedded separators and chunk boundaries', () => {
    const text = 'a,"b ""c"", d",e\n"x\ny",z\n';
    const whole = new CsvParser().write(text);
    expect(whole).toEqual([
      ['a', 'b "c", d', 'e'],
      ['x\ny', 'z'],
    ]);
    // Every split point, including between the two quotes of an escape, gives the same rows.
    for (let split = 1; split < text.length; split++) {
      const parser = new CsvParser();
      const rows = [...parser.write(text.slice(0, split)), ...parser.write(text.slice(split))];
      expect(rows, `split at ${split}`).toEqual(whole);
    }
  });

  it('rejects oversized rows', () => {
    expect(() => new CsvParser(10).write('12345678901,2\n')).toThrow('Oversized');
  });
});
