import { Machine } from './_types';
import { getQueries } from './_utils';

export const config = {
  runtime: 'edge',
};

const MACHINE_ENV = {
  ...process.env,
  TZ: 'Europe/Amsterdam',
};

export default async function GET(req: Request) {
  const queries = getQueries(req.url);

  const APP_NAME = 'auctionoton-on-demand';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.FLY_TOKEN}`,
  };

  const tag = queries.get('tag') || 'latest';

  const createMachineResponse = await fetch(
    `https://api.machines.dev/v1/apps/${APP_NAME}/machines`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        config: {
          image: `registry.fly.io/${APP_NAME}:${tag}`,
          region: 'fra',
          guest: {
            memory_mb: 1024,
            cpu_kind: 'performance',
            cpus: 1,
          },
          auto_destroy: true,
          processes: [
            {
              name: 'start',
              cmd: ['pnpm', 'run', 'server'],
              env: MACHINE_ENV,
            },
          ],
        },
      }),
    },
  );

  if (createMachineResponse.status !== 200) {
    return new Response('Failed to create machine', {
      status: createMachineResponse.status,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  const machine = (await createMachineResponse.json()) as Machine;
  console.info(machine);

  return new Response('OK', {
    status: createMachineResponse.status,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
