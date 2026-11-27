import { WorkflowEntrypoint, exports } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { parseJob, snapshotId } from './contracts';
import { discoverHouseJobs, enabledHouseJobs } from './discovery';
import type { AuctionJob } from './contracts';
import type { Env } from './env';
import { cleanArchiveBatch, prunePriceBatch } from './retention';
import { searchableVersions } from '@auctionoton/search';
import { observeRealm, rebuildSearchIndexes, recordSweep, sweepRealms } from './search-index';
import {
  archiveHouse,
  beginSnapshot,
  normalizeArchive,
  publishSnapshot,
  writeChunk,
} from './storage';

const retry = {
  retries: { limit: 4, delay: '30 seconds', backoff: 'exponential' },
  timeout: '5 minutes',
} as const;

export class MarketMaintenance extends WorkflowEntrypoint<Env, { now: string }> {
  async run(event: WorkflowEvent<{ now: string }>, step: WorkflowStep) {
    const now = new Date(event.payload.now).toISOString();
    let rows = 0;
    let objects = 0;
    for (let index = 0; ; index++) {
      const result = await step.do(`prune-prices-${index}`, retry, () =>
        prunePriceBatch(this.env.MARKET, now),
      );
      rows += result.rows;
      if (result.done) break;
    }
    for (let index = 0; ; index++) {
      const result = await step.do(`clean-archives-${index}`, retry, () =>
        cleanArchiveBatch(this.env, now),
      );
      objects += result.objects;
      if (result.done) break;
    }
    return { rows, objects, now };
  }
}

export class AuctionImport extends WorkflowEntrypoint<Env, AuctionJob> {
  async run(event: WorkflowEvent<AuctionJob>, step: WorkflowStep) {
    const job = parseJob(event.payload);
    const id = snapshotId(job);
    const invalidateCache = () =>
      step.do('invalidate-price-cache', retry, async () => {
        const response = await exports.default.fetch(
          new Request('https://cache.internal/admin/cache/market', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.env.ADMIN_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(job),
          }),
        );
        await response.body?.cancel();
        if (!response.ok) throw new Error('Market cache invalidation failed');
      });
    try {
      const needed = await step.do('begin-snapshot', retry, () =>
        beginSnapshot(this.env.MARKET, job),
      );
      if (!needed) {
        await invalidateCache();
        return { id, alreadyComplete: true };
      }
      const archive = await step.do('archive-provider-response', retry, () =>
        archiveHouse(this.env, job),
      );
      const manifest = await step.do('normalize-archive', retry, () =>
        normalizeArchive(this.env, job, archive),
      );
      for (let index = 0; index < manifest.chunks; index++) {
        await step.do(`write-chunk-${index}`, retry, () => writeChunk(this.env, job, index));
      }
      const published = await step.do('publish-snapshot', retry, () =>
        publishSnapshot(this.env.MARKET, job, manifest),
      );
      await invalidateCache();
      return published;
    } catch (error) {
      await step.do('record-failure', retry, async () => {
        const message = error instanceof Error ? error.message.slice(0, 500) : 'Import failed';
        await this.env.MARKET.prepare(
          "UPDATE snapshots SET status = 'failed', error = ? WHERE snapshot_key = ? AND status != 'complete'",
        )
          .bind(message, id)
          .run();
        // A Workflow failure happens after Queue acknowledgement and needs its own failure record.
        await this.env.FAILED_JOBS.send({ id, job, error: message });
      });
      throw error;
    }
  }
}

export class DailyDiscovery extends WorkflowEntrypoint<Env, { day: string }> {
  async run(event: WorkflowEvent<{ day: string }>, step: WorkflowStep) {
    const day = event.payload.day;
    const jobs = await step.do('discover-houses', retry, async () =>
      discoverHouseJobs(enabledHouseJobs(this.env, day)),
    );
    for (let offset = 0; offset < jobs.length; offset += 100) {
      await step.do(`enqueue-houses-${offset}`, retry, () =>
        this.env.AUCTION_JOBS.sendBatch(
          jobs.slice(offset, offset + 100).map((job) => ({ body: job })),
        ),
      );
    }
    return {
      day,
      expectedHouses: jobs.length,
      snapshotId: jobs.length === 1 ? snapshotId(jobs[0]!) : undefined,
      snapshotIds: jobs.map(snapshotId),
    };
  }
}

/** The weekly Realm sweep: which items each Game version trades, then fresh search indexes. */
export class RealmSweep extends WorkflowEntrypoint<Env, { day: string }> {
  async run(event: WorkflowEvent<{ day: string }>, step: WorkflowStep) {
    const { day } = event.payload;
    const startedAt = await step.do('start', async () => new Date().toISOString());
    const summary: Record<string, Awaited<ReturnType<typeof recordSweep>>> = {};
    for (const version of searchableVersions) {
      const results: (number[] | null)[] = [];
      for (const realm of sweepRealms(version)) {
        try {
          results.push(
            await step.do(
              `observe-${version}-${realm.region}-${realm.slug}`,
              {
                retries: { limit: 2, delay: '10 seconds', backoff: 'exponential' },
                timeout: '2 minutes',
              },
              () => observeRealm(realm),
            ),
          );
        } catch {
          // One unreachable realm must not fail the sweep; recordSweep weighs failures.
          results.push(null);
        }
      }
      summary[version] = await step.do(`record-${version}`, retry, () =>
        recordSweep(
          this.env.MARKET,
          version,
          `${day}-${version}`,
          startedAt,
          results,
          new Date().toISOString(),
        ),
      );
    }
    const indexes = await step.do('rebuild-search-indexes', retry, () =>
      rebuildSearchIndexes(this.env),
    );
    return { day, summary, indexes };
  }
}
