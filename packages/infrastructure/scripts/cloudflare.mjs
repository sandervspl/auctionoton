import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const directory = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(directory, '../..');
const env = { ...process.env };
const command = process.argv[2];
if (!['plan', 'deploy', 'dev'].includes(command)) throw new Error('Expected plan, deploy, or dev');
const stage = command === 'dev' ? 'local' : (process.argv[3] ?? 'staging');
if (!['staging', 'production'].includes(stage) && command !== 'dev')
  throw new Error('Expected stage staging or production');
// alchemy.run.ts reads this to select stage-specific configuration.
env.AUCTIONOTON_STAGE = stage;
const allowed = new Set([
  'CF_TRIAL_ADMIN_TOKEN',
  'CF_TRIAL_AUTH_SECRET',
  'CF_TRIAL_HOUSE_ID',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCESS_ISSUER',
  'CLOUDFLARE_ACCESS_AUD',
  'CLOUDFLARE_ACCESS_GOOGLE_AUD',
  'CLOUDFLARE_ACCESS_USER_ID_MAP',
  'SEARCH_ADMIN_EMAILS',
]);
// Optional keys; every other allowed key is required.
const optional = new Set(['CLOUDFLARE_ACCESS_USER_ID_MAP', 'SEARCH_ADMIN_EMAILS']);
// Production uses its own admin and auth secrets from .env.production.local. Earlier files win,
// so .env.local overrides .env.
const envFiles = [
  ...(stage === 'production' ? ['packages/infrastructure/.env.production.local'] : []),
  'packages/infrastructure/.env.local',
  'packages/infrastructure/.env',
  'apps/website/.env.local',
];
// Access audiences belong to one environment; production must never fall back to staging's.
const productionOnly = new Set([
  'CLOUDFLARE_ACCESS_AUD',
  'CLOUDFLARE_ACCESS_GOOGLE_AUD',
  'CLOUDFLARE_ACCESS_USER_ID_MAP',
]);
for (const path of envFiles) {
  const filename = resolve(root, path);
  if (!existsSync(filename)) continue;
  const productionFile = path.endsWith('.env.production.local');
  for (const [key, value] of Object.entries(parseEnv(readFileSync(filename, 'utf8')))) {
    if (stage === 'production' && productionOnly.has(key) && !productionFile) continue;
    if (allowed.has(key) && !env[key]) env[key] = value;
  }
}
// Local development may reuse Wrangler's OAuth grant without copying it into the repository.
// Wrangler keeps it in ~/.wrangler or, on newer installs, its XDG config directory
// (%APPDATA%\xdg.config on Windows).
if (!env.CLOUDFLARE_API_TOKEN && !env.CI) {
  const configDirs = [
    resolve(homedir(), '.wrangler'),
    resolve(env.XDG_CONFIG_HOME ?? resolve(homedir(), '.config'), '.wrangler'),
    ...(env.APPDATA ? [resolve(env.APPDATA, 'xdg.config/.wrangler')] : []),
  ];
  for (const directory of configDirs) {
    const filename = resolve(directory, 'config/default.toml');
    if (!existsSync(filename)) continue;
    const config = readFileSync(filename, 'utf8');
    const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
    const expiration = config.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];
    if (token && expiration && Date.parse(expiration) > Date.now()) {
      env.CLOUDFLARE_API_TOKEN = token;
      break;
    }
  }
}
for (const key of allowed) {
  if (optional.has(key)) continue;
  if (!env[key]) throw new Error(`Missing ${key}; see packages/infrastructure/.env.example`);
}
const bin = fileURLToPath(new URL('../bin/cli.js', import.meta.resolve('alchemy')));
const child = spawn(
  process.execPath,
  [bin, command, '--stage', stage, '--no-input', ...(command === 'deploy' ? ['--yes'] : [])],
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
