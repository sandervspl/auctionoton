import { spawn } from 'node:child_process';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

// An explicit staging-only data import. Alchemy remains the sole schema migration owner.
const root = fileURLToPath(new URL('../../..', import.meta.url));
const local = parseEnv(await readFile(resolve(root, 'apps/server/.env'), 'utf8').catch(() => ''));
const clientId = process.env.BNET_CLIENT_ID || local.BNET_CLIENT_ID;
const clientSecret = process.env.BNET_CLIENT_SECRET || local.BNET_CLIENT_SECRET;
if (!clientId || !clientSecret) throw new Error('Missing BNET_CLIENT_ID or BNET_CLIENT_SECRET');
const tokenResponse = await fetch('https://eu.battle.net/oauth/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials',
  signal: AbortSignal.timeout(30000),
});
if (!tokenResponse.ok) throw new Error(`Blizzard authentication failed: ${tokenResponse.status}`);
const { access_token: accessToken } = await tokenResponse.json();
const quality = {
  POOR: 0,
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
  ARTIFACT: 6,
  HEIRLOOM: 7,
};
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const slug = (value) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const statements = [];
let cursor = 1;
while (true) {
  const params = new URLSearchParams({
    namespace: 'static-classic1x-eu',
    locale: 'en_US',
    _pageSize: '1000',
    orderby: 'id',
    id: `[${cursor},]`,
  });
  const response = await fetch(`https://eu.api.blizzard.com/data/wow/search/item?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
  const { results } = await response.json();
  if (!Array.isArray(results)) throw new Error('Invalid catalog response');
  if (results.length === 0) break;
  for (const { data } of results) {
    const name = data.name?.en_US;
    if (!Number.isSafeInteger(data.id) || data.id < cursor || typeof name !== 'string' || !name)
      throw new Error('Invalid catalog item or pagination order');
    const values = [
      data.id,
      quote(name),
      quote(slug(name)),
      quality[data.quality?.type] ?? 1,
      Number(data.level) || 0,
      Number(data.required_level) || 0,
    ];
    statements.push(
      `INSERT INTO item_metadata (id,name,slug,quality,item_level,required_level) VALUES (${values.join(',')}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,quality=excluded.quality,item_level=excluded.item_level,required_level=excluded.required_level;`,
    );
  }
  const next = results.at(-1).data.id + 1;
  if (next <= cursor) throw new Error('Catalog pagination did not advance');
  cursor = next;
  console.info(`Downloaded ${statements.length} item names`);
  if (results.length < 1000) break;
}
if (!statements.length) throw new Error('Refusing an empty catalog import');
const directory = await mkdtemp(resolve(tmpdir(), 'auctionoton-catalog-'));
try {
  const filename = resolve(directory, 'catalog.sql');
  await writeFile(filename, statements.join('\n'));
  const child = spawn(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      'auctionoton-staging-market',
      '--remote',
      '--file',
      filename,
      '--yes',
    ],
    {
      cwd: resolve(root, 'packages/infrastructure'),
      stdio: 'inherit',
      env: process.env,
    },
  );
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', resolve);
  });
  if (code !== 0) throw new Error(`Catalog import exited with ${code}`);
  console.info(`Imported ${statements.length} Blizzard item names into staging`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
