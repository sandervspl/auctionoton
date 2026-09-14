import {
  createScheduledController,
  introspectWorkflowInstance,
  introspectWorkflow,
} from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import worker from '../src/index';

it('keeps staging cron disabled and uses the scheduled UTC date when enabled', async () => {
  await using workflows = await introspectWorkflow(env.DAILY_DISCOVERY);
  await workflows.modifyAll(async (modifier) => {
    await modifier.mockStepResult({ name: 'discover-houses' }, 'catalog/2026-09-14.json');
    await modifier.mockStepResult({ name: 'read-selected-houses' }, [
      {
        day: '2026-09-14',
        region: 'eu',
        version: 'seasonal',
        auctionHouseId: 509,
      },
    ]);
  });
  const event = createScheduledController({
    scheduledTime: Date.parse('2026-09-14T04:00:00.000Z'),
    cron: '0 4 * * *',
  });
  await worker.scheduled(event, env);
  expect((await workflows.get()).length).toBe(0);
  await worker.scheduled(event, { ...env, DAILY_ENABLED: 'true' });
  const instances = await workflows.get();
  expect(instances.length).toBe(1);
  await instances[0].waitForStatus('complete');
  const output = (await instances[0].getOutput()) as {
    day: string;
    expectedHouses: number;
    snapshotId: string;
  };
  expect(output.day).toBe('2026-09-14');
  expect(output.expectedHouses).toBe(1);
  expect(output.snapshotId).toBe('seasonal-eu-509-2026-09-14');
});

it('runs maintenance independently while auction discovery stays disabled', async () => {
  await using workflow = await introspectWorkflowInstance(
    env.MARKET_MAINTENANCE,
    'maintenance-2026-09-14',
  );
  await worker.scheduled(
    createScheduledController({
      scheduledTime: Date.parse('2026-09-14T04:30:00Z'),
      cron: '30 4 * * *',
    }),
    env,
  );
  await workflow.waitForStatus('complete');
  expect(await workflow.getOutput()).toMatchObject({ rows: 0, objects: 0 });
});
