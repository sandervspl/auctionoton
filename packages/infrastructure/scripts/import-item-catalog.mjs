import { spawn } from 'node:child_process';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { blizzardCatalog } from './blizzard-catalog.mjs';

// An explicit staging-only data import. Alchemy remains the schema migration owner.
// --output prepares a reviewable SQL file without writing to Cloudflare.
const root = fileURLToPath(new URL('../../..', import.meta.url));
const local = parseEnv(await readFile(resolve(root, 'apps/server/.env'), 'utf8').catch(() => ''));
const clientId = process.env.BNET_CLIENT_ID || local.BNET_CLIENT_ID;
const clientSecret = process.env.BNET_CLIENT_SECRET || local.BNET_CLIENT_SECRET;
if (!clientId || !clientSecret) throw new Error('Missing BNET_CLIENT_ID or BNET_CLIENT_SECRET');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--output'))
  throw new Error('Usage: node import-item-catalog.mjs [--output /path/catalog.sql]');
const items = await blizzardCatalog(clientId, clientSecret, console.info);
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
const statements = items.map((item) => {
  const name = item.name?.en_US;
  if (typeof name !== 'string' || !name) throw new Error(`Incomplete item ${item.id}`);
  const values = [
    item.id,
    quote(name),
    quote(slug(name)),
    quality[item.quality?.type] ?? 1,
    Number(item.level) || 0,
    Number(item.required_level) || 0,
    quote(item.icon ?? ''),
  ];
  return `INSERT INTO item_metadata (id,name,slug,quality,item_level,required_level,icon)
VALUES (${values.join(',')}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,
slug=excluded.slug,quality=excluded.quality,item_level=excluded.item_level,
required_level=excluded.required_level,icon=excluded.icon
WHERE name IS NOT excluded.name OR slug IS NOT excluded.slug OR quality IS NOT excluded.quality
OR item_level IS NOT excluded.item_level OR required_level IS NOT excluded.required_level
OR icon IS NOT excluded.icon;`;
});
console.info(
  `Resolved ${items.filter((item) => item.icon).length}/${items.length} item icons (${new Set(items.map((item) => item.icon).filter(Boolean)).size} distinct images)`,
);
if (args[0] === '--output') {
  await writeFile(args[1], statements.join('\n'));
  console.info(`Prepared ${items.length} items in ${args[1]}`);
} else {
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
    console.info(`Imported ${items.length} Blizzard item names and icons into staging`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
