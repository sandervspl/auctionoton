import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { archivePendingSnapshot, archiveSnapshot } from '../src/archive';
import {
  archiveKey,
  isSealedMonth,
  listArchivedMonths,
  monthsBetween,
  oldestHotDay,
  readArchivedItem,
  replaceArchivedDay,
} from '../src/history-archive';
import type { ArchivedPrice, HistoryBucket } from '../src/history-archive';

const price = (itemId: number, day: string, minBuyout: number): ArchivedPrice => ({
  itemId,
  day,
  fetchedAt: Date.parse(`${day}T04:01:00.000Z`),
  minBuyout,
  marketValue: minBuyout + 1,
  historical: minBuyout + 2,
});

describe('archive calendar', () => {
  it('seals a month once its last day leaves hot history', () => {
    expect(oldestHotDay('2026-12-15T12:00:00Z')).toBe('2026-12-01');
    expect(isSealedMonth('2026-11', '2026-12-14T12:00:00Z')).toBe(false);
    expect(isSealedMonth('2026-11', '2026-12-15T12:00:00Z')).toBe(true);
    expect(monthsBetween('2025-11-20', '2026-02-01')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });
});

describe('monthly archive files', () => {
  it('replaces one day at a time and reads back a single item', async () => {
    const house = 'forever-eu-archive-roundtrip';
    // Prices above 2^31 copper must survive the round trip.
    const items = Array.from({ length: 9000 }, (_, i) => i + 1);
    await replaceArchivedDay(
      env.HISTORY,
      house,
      '2026-11-02',
      items.map((id) => price(id, '2026-11-02', id * 10)),
    );
    await replaceArchivedDay(
      env.HISTORY,
      house,
      '2026-11-01',
      items.map((id) => price(id, '2026-11-01', 90_000_000_100)),
    );
    // A retried day replaces its rows instead of duplicating them.
    await replaceArchivedDay(
      env.HISTORY,
      house,
      '2026-11-02',
      items.map((id) => price(id, '2026-11-02', id * 20)),
    );
    const rows = await readArchivedItem(env.HISTORY, house, '2026-11', 4321);
    expect(rows).toEqual([
      price(4321, '2026-11-01', 90_000_000_100),
      price(4321, '2026-11-02', 86_420),
    ]);
    expect(await readArchivedItem(env.HISTORY, house, '2026-11', 99_999)).toEqual([]);
    expect(await readArchivedItem(env.HISTORY, house, '2026-10', 4321)).toEqual([]);
    await replaceArchivedDay(env.HISTORY, house, '2026-12-01', [price(1, '2026-12-01', 5)]);
    expect(await listArchivedMonths(env.HISTORY, house)).toEqual(['2026-11', '2026-12']);
  });

  it('reads an item with two small range requests instead of the whole file', async () => {
    const house = 'forever-eu-archive-ranges';
    // Scrambled prices keep the file well above the 64 KiB tail read.
    const scrambled = (i: number) => (i * 7919) % 1_000_003;
    const rows = Array.from({ length: 60_000 }, (_, i) => price(i + 1, '2026-11-03', scrambled(i)));
    await replaceArchivedDay(env.HISTORY, house, '2026-11-03', rows);
    const reads: number[] = [];
    const counting: HistoryBucket = {
      ...env.HISTORY,
      head: (key) => env.HISTORY.head(key),
      put: (key, value, options) => env.HISTORY.put(key, value, options),
      list: (options) => env.HISTORY.list(options),
      async get(key, options) {
        const object = await env.HISTORY.get(key, options);
        if (!object) return null;
        return {
          size: object.size,
          etag: object.etag,
          async arrayBuffer() {
            const bytes = await object.arrayBuffer();
            reads.push(bytes.byteLength);
            return bytes;
          },
        };
      },
    };
    expect(await readArchivedItem(counting, house, '2026-11', 12_345)).toEqual([
      price(12_345, '2026-11-03', scrambled(12_344)),
    ]);
    const size = (await env.HISTORY.head(archiveKey(house, '2026-11')))!.size;
    expect(size).toBeGreaterThan(256 * 1024);
    expect(reads.length).toBeLessThanOrEqual(2);
    expect(reads.reduce((a, b) => a + b, 0)).toBeLessThan(size);
  });

  it('refuses to overwrite a file another import changed in between', async () => {
    const house = 'forever-eu-archive-race';
    await replaceArchivedDay(env.HISTORY, house, '2026-11-01', [price(1, '2026-11-01', 1)]);
    const racing: HistoryBucket = {
      get: (key, options) => env.HISTORY.get(key, options),
      head: (key) => env.HISTORY.head(key),
      list: (options) => env.HISTORY.list(options),
      async put(key, value, options) {
        await env.HISTORY.put(key, value);
        return env.HISTORY.put(key, value, options);
      },
    };
    await expect(
      replaceArchivedDay(racing, house, '2026-11-02', [price(1, '2026-11-02', 2)]),
    ).rejects.toThrow('changed during the write');
  });
});

describe('archiving published snapshots', () => {
  async function seedSnapshot(key: string, day: string, rows: number, expected = rows) {
    const id = await env.MARKET.prepare(`INSERT INTO snapshots
      (snapshot_key,house_key,region,version,auction_house_id,day,status,fetched_at,completed_at,expected_rows)
      VALUES (?,'forever-eu-archiving','eu','forever',573,?,'complete',?,?,?) RETURNING id`)
      .bind(key, day, `${day}T04:01:00.000Z`, `${day}T04:02:00.000Z`, expected)
      .first<number>('id');
    for (let offset = 0; offset < rows; offset += 19) {
      const size = Math.min(19, rows - offset);
      await env.MARKET.prepare(
        `INSERT INTO prices VALUES ${Array.from({ length: size }, () => '(?,?,?,7,8)').join(',')}`,
      )
        .bind(...Array.from({ length: size }, (_, i) => [id, offset + i + 1, offset + i]).flat())
        .run();
    }
    return id!;
  }

  it('copies every D1 row into the month file once and marks the snapshot archived', async () => {
    const id = await seedSnapshot('archiving-1', '2026-10-05', 5100);
    const now = '2026-10-05T05:00:00.000Z';
    expect(await archiveSnapshot(env, id, now)).toEqual({ archived: true, rows: 5100 });
    expect(await archiveSnapshot(env, id, now)).toEqual({ archived: false, rows: 0 });
    expect(
      await env.MARKET.prepare('SELECT archived_at FROM snapshots WHERE id=?')
        .bind(id)
        .first('archived_at'),
    ).toBe(now);
    expect(await readArchivedItem(env.HISTORY, 'forever-eu-archiving', '2026-10', 5100)).toEqual([
      {
        itemId: 5100,
        day: '2026-10-05',
        fetchedAt: Date.parse('2026-10-05T04:01:00.000Z'),
        minBuyout: 5099,
        marketValue: 7,
        historical: 8,
      },
    ]);
  });

  it('refuses a snapshot whose rows disagree with its manifest and catches up pending ones', async () => {
    const broken = await seedSnapshot('archiving-broken', '2026-10-06', 3, 4);
    await expect(archiveSnapshot(env, broken, '2026-10-06T05:00:00.000Z')).rejects.toThrow(
      'row count mismatch',
    );
    await env.MARKET.prepare('DELETE FROM snapshots WHERE id=?').bind(broken).run();
    const pending = await seedSnapshot('archiving-pending', '2026-10-07', 2);
    expect(await archivePendingSnapshot(env, '2026-10-07T05:00:00.000Z')).toEqual({
      rows: 2,
      done: false,
    });
    expect(await archivePendingSnapshot(env, '2026-10-07T05:00:00.000Z')).toMatchObject({
      done: true,
    });
    expect(
      await env.MARKET.prepare('SELECT archived_at FROM snapshots WHERE id=?')
        .bind(pending)
        .first('archived_at'),
    ).not.toBeNull();
  });
});
