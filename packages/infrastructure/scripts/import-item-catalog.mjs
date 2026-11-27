import { spawn } from 'node:child_process';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { blizzardCatalog } from './blizzard-catalog.mjs';
import { slugify } from '../../search/src/normalize.ts';

// An explicit data import into one stage's market database. Alchemy remains the schema
// migration owner. --output prepares a reviewable SQL file without writing to Cloudflare.
const root = fileURLToPath(new URL('../../..', import.meta.url));
const readEnv = async (name) =>
  parseEnv(await readFile(resolve(root, 'packages/infrastructure', name), 'utf8').catch(() => ''));
const local = { ...(await readEnv('.env')), ...(await readEnv('.env.local')) };
const clientId = process.env.BNET_CLIENT_ID || local.BNET_CLIENT_ID;
const clientSecret = process.env.BNET_CLIENT_SECRET || local.BNET_CLIENT_SECRET;
if (!clientId || !clientSecret) throw new Error('Missing BNET_CLIENT_ID or BNET_CLIENT_SECRET');
const usage =
  'Usage: node import-item-catalog.mjs [staging|production] [--output /path/catalog.sql]';
const args = process.argv.slice(2);
const stage = args[0] && !args[0].startsWith('--') ? args.shift() : 'staging';
if (!['staging', 'production'].includes(stage)) throw new Error(usage);
if (args.length && (args.length !== 2 || args[0] !== '--output')) throw new Error(usage);
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
const text = (value) => (typeof value === 'string' ? value : '');
// New items start their search grace window now; first_seen_at never changes afterwards.
const importedAt = new Date().toISOString();
const statements = items.map((item) => {
  const name = item.name?.en_US;
  if (typeof name !== 'string' || !name) throw new Error(`Incomplete item ${item.id}`);
  const values = [
    item.id,
    quote(name),
    quote(slugify(name)),
    quality[item.quality?.type] ?? 1,
    Number(item.level) || 0,
    Number(item.required_level) || 0,
    quote(item.icon ?? ''),
    item.binding ? quote(item.binding) : 'NULL',
    quote(text(item.item_class?.name?.en_US)),
    quote(text(item.item_subclass?.name?.en_US)),
    quote(importedAt),
  ];
  return `INSERT INTO item_metadata (id,name,slug,quality,item_level,required_level,icon,binding,
item_class,item_subclass,first_seen_at)
VALUES (${values.join(',')}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,
slug=excluded.slug,quality=excluded.quality,item_level=excluded.item_level,
required_level=excluded.required_level,icon=excluded.icon,binding=excluded.binding,
item_class=excluded.item_class,item_subclass=excluded.item_subclass
WHERE name IS NOT excluded.name OR slug IS NOT excluded.slug OR quality IS NOT excluded.quality
OR item_level IS NOT excluded.item_level OR required_level IS NOT excluded.required_level
OR icon IS NOT excluded.icon OR binding IS NOT excluded.binding
OR item_class IS NOT excluded.item_class OR item_subclass IS NOT excluded.item_subclass;`;
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
    // Run Wrangler's script with Node directly; spawning `pnpm` fails on Windows.
    const wrangler = fileURLToPath(new URL('../bin/wrangler.js', import.meta.resolve('wrangler')));
    const child = spawn(
      process.execPath,
      [
        wrangler,
        'd1',
        'execute',
        `auctionoton-${stage}-market`,
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
    console.info(`Imported ${items.length} Blizzard item names and icons into ${stage}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  // New, renamed or newly bound items reach search only through a rebuilt index.
  const secrets =
    stage === 'production' ? await readEnv('.env.production.local') : await readEnv('.env.local');
  const admin = process.env.CF_TRIAL_ADMIN_TOKEN || secrets.CF_TRIAL_ADMIN_TOKEN;
  const backend =
    stage === 'production'
      ? 'https://auctionoton-api.sandervspl.dev'
      : 'https://auctionoton-staging-backend.sandervispoel.workers.dev';
  const rebuild = admin
    ? await fetch(`${backend}/admin/search/rebuild`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin}` },
      })
    : undefined;
  if (rebuild?.ok) console.info('Rebuilt search indexes', await rebuild.json());
  else
    console.warn(
      `Search indexes were not rebuilt (${rebuild ? rebuild.status : 'no CF_TRIAL_ADMIN_TOKEN'}); POST ${backend}/admin/search/rebuild`,
    );
}
