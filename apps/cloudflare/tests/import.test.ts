import { introspectWorkflowInstance } from 'cloudflare:test';
import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { snapshotId } from '../src/contracts';
import type { AuctionJob, Price } from '../src/contracts';
import { beginSnapshot, normalizeArchive, publishSnapshot, writeChunk } from '../src/storage';

const job = (day: string): AuctionJob => ({
  region: 'eu',
  version: 'seasonal',
  auctionHouseId: 509,
  day,
});
const item = (itemId: number, price = 100): Price => ({
  auctionHouseId: 509,
  itemId,
  petSpeciesId: null,
  minBuyout: price,
  quantity: 2,
  marketValue: 120,
  historical: 110,
  numAuctions: 1,
});
async function seedArchive(job: AuctionJob, data: unknown) {
  const rawKey = `raw/${snapshotId(job)}.json`;
  const fetchedAt = `${job.day}T04:00:00.000Z`;
  const body = JSON.stringify(data);
  await env.SNAPSHOTS.put(rawKey, body, { customMetadata: { fetchedAt } });
  return {
    rawKey,
    fetchedAt,
    providerModifiedAt: null,
    bytes: new TextEncoder().encode(body).length,
  };
}
async function importDirect(job: AuctionJob, rows: Price[]) {
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
      .bind(snapshotId(next))
      .first<{ n: number }>();
    expect(count?.n).toBe(501);
  });

  it('does not let an older job replace a newer published snapshot', async () => {
    await importDirect(job('2026-09-04'), [item(123, 400)]);
    await importDirect(job('2026-09-03'), [item(123, 300)]);
    expect((await readPrice()).stats.current.minBuyout).toBe(400);
  });

  it('publishes a verified empty array and preserves pet variants', async () => {
    const pets = job('2026-09-05');
    await importDirect(pets, [item(123), { ...item(123), petSpeciesId: 10 }]);
    const count = await env.MARKET.prepare('SELECT COUNT(*) AS n FROM prices WHERE snapshot_id = ?')
      .bind(snapshotId(pets))
      .first<{ n: number }>();
    expect(count?.n).toBe(2);
    await importDirect(job('2026-09-06'), []);
    expect((await readPrice()).error).toBe(true);
  });

  it.each([
    { error: 'provider outage' },
    [{ ...item(123), minBuyout: Number.MAX_SAFE_INTEGER + 1 }],
    [{ ...item(123), auctionHouseId: 999 }],
  ])('rejects malformed or unsafe provider data', async (data) => {
    const badJob = job('2026-08-01');
    const archive = await seedArchive(badJob, data);
    await expect(normalizeArchive(env, badJob, archive)).rejects.toThrow();
  });

  it('runs a real Workflow, retries a failed D1 step, and reuses R2 on duplicate delivery', async () => {
    const retryJob = job('2026-09-10');
    const id = snapshotId(retryJob);
    await seedArchive(retryJob, [item(123, 1000)]);
    await using workflow = await introspectWorkflowInstance(env.AUCTION_IMPORT, id);
    await workflow.modify(async (modifier) => {
      await modifier.disableRetryDelays();
      await modifier.mockStepError({ name: 'write-chunk-0' }, new Error('Transient D1 failure'), 1);
    });
    await env.AUCTION_IMPORT.createBatch([{ id, params: retryJob }]);
    await workflow.waitForStatus('complete');
    expect((await readPrice()).stats.current.minBuyout).toBe(1000);
    await env.AUCTION_IMPORT.createBatch([{ id, params: retryJob }]);
    const stored = await env.MARKET.prepare(
      'SELECT COUNT(*) AS n FROM prices WHERE snapshot_id = ?',
    )
      .bind(id)
      .first<{ n: number }>();
    expect(stored?.n).toBe(1);
    expect((await readPrice()).stats.lastUpdated).toBe('2026-09-10T04:00:00.000Z');
  });
});
