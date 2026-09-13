import { createScheduledController, introspectWorkflow } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import worker from '../src/index';

it('keeps staging cron disabled and uses the scheduled UTC date when enabled', async () => {
  await using workflows = await introspectWorkflow(env.DAILY_DISCOVERY);
  await workflows.modifyAll(async (modifier) => {
    await modifier.mockStepResult({ name: 'discover-trial-house' }, 'catalog/2026-09-14.json');
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
