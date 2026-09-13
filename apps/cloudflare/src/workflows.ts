import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { parseJob, providerVersions, snapshotId } from './contracts';
import type { AuctionJob, ProviderRegion, Version } from './contracts';
import type { Env } from './env';
import { readBoundedText } from './http';
import { providerFetch, providerRetry } from './provider';
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

export class AuctionImport extends WorkflowEntrypoint<Env, AuctionJob> {
  async run(event: WorkflowEvent<AuctionJob>, step: WorkflowStep) {
    const job = parseJob(event.payload);
    const id = snapshotId(job);
    try {
      const needed = await step.do('begin-snapshot', retry, () =>
        beginSnapshot(this.env.MARKET, job),
      );
      if (!needed) return { id, alreadyComplete: true };
      const archive = await step.do(
        'archive-provider-response',
        providerRetry(this.env, job.version),
        () => archiveHouse(this.env, job),
      );
      const manifest = await step.do('normalize-archive', retry, () =>
        normalizeArchive(this.env, job, archive),
      );
      for (let index = 0; index < manifest.chunks; index++) {
        await step.do(`write-chunk-${index}`, retry, () => writeChunk(this.env, job, index));
      }
      return await step.do('publish-snapshot', retry, () =>
        publishSnapshot(this.env.MARKET, job, manifest),
      );
    } catch (error) {
      await step.do('record-failure', retry, async () => {
        const message = error instanceof Error ? error.message.slice(0, 500) : 'Import failed';
        await this.env.MARKET.prepare(
          "UPDATE snapshots SET status = 'failed', error = ? WHERE id = ? AND status != 'complete'",
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
    const job = parseJob({
      day: event.payload.day,
      region: this.env.TRIAL_REGION,
      version: this.env.TRIAL_VERSION,
      auctionHouseId: Number(this.env.TRIAL_HOUSE_ID),
    });
    const catalogKey = await step.do(
      'discover-trial-house',
      providerRetry(this.env, job.version),
      async () => {
        const response = await providerFetch(
          this.env,
          job.version,
          'https://realm-api.tradeskillmaster.com/realms',
        );
        const body = await readBoundedText(response, 2 * 1024 * 1024);
        const catalog = JSON.parse(body) as { items: ProviderRegion[] };
        const region = catalog.items.find(
          (item) =>
            item.regionPrefix === job.region &&
            item.gameVersion === providerVersions[job.version as Version],
        );
        if (
          !region?.realms.some((realm) =>
            realm.auctionHouses.some((house) => house.auctionHouseId === job.auctionHouseId),
          )
        ) {
          throw new Error('Configured trial auction house is absent from the provider catalog');
        }
        const key = `catalog/${job.day}.json`;
        await this.env.SNAPSHOTS.put(key, body, {
          httpMetadata: { contentType: 'application/json' },
        });
        return key;
      },
    );
    await step.do('enqueue-trial-house', retry, () => this.env.AUCTION_JOBS.send(job));
    return { day: job.day, expectedHouses: 1, catalogKey, snapshotId: snapshotId(job) };
  }
}
