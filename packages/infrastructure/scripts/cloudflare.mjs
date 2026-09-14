import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const directory = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(directory, '../..');
const env = { ...process.env };
const allowed = new Set([
  'CF_TRIAL_ADMIN_TOKEN',
  'CF_TRIAL_AUTH_SECRET',
  'CF_TRIAL_HOUSE_ID',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'TSM_CLIENT_ID',
  'TSM_API_KEY',
  'TSM_API_KEY_B',
  'TSM_API_KEY_C',
  'TSM_API_KEY_D',
  'CLOUDFLARE_ACCESS_ISSUER',
  'CLOUDFLARE_ACCESS_AUD',
  'CLOUDFLARE_ACCESS_GOOGLE_AUD',
  'CLOUDFLARE_ACCESS_USER_ID_MAP',
]);
for (const path of [
  'packages/infrastructure/.env.local',
  'apps/server/.env',
  'apps/website/.env.local',
]) {
  const filename = resolve(root, path);
  if (!existsSync(filename)) continue;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(filename, 'utf8')))) {
    if (allowed.has(key) && !env[key]) env[key] = value;
  }
}
// Local development may reuse Wrangler's OAuth grant without copying it into the repository.
if (!env.CLOUDFLARE_API_TOKEN && !env.CI) {
  const filename = resolve(homedir(), '.wrangler/config/default.toml');
  if (existsSync(filename)) {
    const config = readFileSync(filename, 'utf8');
    const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
    const expiration = config.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];
    if (token && expiration && Date.parse(expiration) > Date.now())
      env.CLOUDFLARE_API_TOKEN = token;
  }
}
const command = process.argv[2];
if (!['plan', 'deploy', 'dev'].includes(command)) throw new Error('Expected plan, deploy, or dev');
for (const key of allowed) {
  if (key === 'CLOUDFLARE_ACCESS_USER_ID_MAP') continue;
  if (!env[key]) throw new Error(`Missing ${key}; see packages/infrastructure/.env.example`);
}
const bin = fileURLToPath(new URL('../bin/cli.js', import.meta.resolve('alchemy')));
const child = spawn(
  process.execPath,
  [
    bin,
    command,
    '--stage',
    command === 'dev' ? 'local' : 'staging',
    '--no-input',
    ...(command === 'deploy' ? ['--yes'] : []),
  ],
  {
    cwd: directory,
    stdio: 'inherit',
    env,
  },
);
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
