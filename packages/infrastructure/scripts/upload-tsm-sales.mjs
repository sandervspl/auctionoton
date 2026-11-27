import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

// Uploads Sale rates (units sold per day per region) from the TSM desktop app's local region data
// to a stage, which uses them only to rank search results. Reads every WoW client folder's
// TradeSkillMaster_AppHelper/AppData.lua; sends item ids and rates, never prices.
// Usage: node upload-tsm-sales.mjs [staging|production] [--dry-run]   (WOW_DIR overrides the WoW folder)

const usage = 'Usage: node upload-tsm-sales.mjs [staging|production] [--dry-run]';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [stage = 'staging', ...extra] = args.filter((arg) => arg !== '--dry-run');
if (!['staging', 'production'].includes(stage) || extra.length) throw new Error(usage);
const root = fileURLToPath(new URL('../../..', import.meta.url));
const readEnv = async (name) =>
  parseEnv(await readFile(resolve(root, 'packages/infrastructure', name), 'utf8').catch(() => ''));
const secrets =
  stage === 'production'
    ? await readEnv('.env.production.local')
    : { ...(await readEnv('.env')), ...(await readEnv('.env.local')) };
const admin = process.env.CF_TRIAL_ADMIN_TOKEN || secrets.CF_TRIAL_ADMIN_TOKEN;
if (!admin && !dryRun) throw new Error('Missing CF_TRIAL_ADMIN_TOKEN');
const backend =
  stage === 'production'
    ? 'https://auctionoton-api.sandervspl.dev'
    : 'https://auctionoton-staging-backend.sandervispoel.workers.dev';
const wowDir = process.env.WOW_DIR || 'C:\\Program Files (x86)\\World of Warcraft';
// Data older than this no longer says what trades now.
const MAX_AGE_DAYS = 30;

/** TSM region keys, e.g. "Forever-EU", to the Game versions the item catalog covers. */
function versionFor(regionKey) {
  const name = regionKey.replace(/-(EU|US)$/, '');
  if (name === 'Classic') return 'era';
  if (name === 'Fresh') return 'anniversary';
  if (name === 'Forever') return 'forever';
  if (/HC|Hardcore/i.test(name)) return 'hardcore';
  if (/SoD|Season/i.test(name)) return 'seasonal';
  return undefined; // e.g. BCC (Classic progression) and retail: not in the item catalog
}

/** TSM encodes numbers in base 32 (0-9, A-V). */
const decode = (value) => Number.parseInt(value, 32);

function regionSales(text) {
  const blocks = [];
  for (const match of text.matchAll(
    /LoadData\("AUCTIONDB_REGION_SALE","([^"]+)",\[\[return (\{.*?\})\]\]\)/gs,
  )) {
    const [, regionKey, body] = match;
    const downloadTime = Number(body.match(/downloadTime=(\d+)/)?.[1]);
    const fields = [...(body.match(/fields=\{([^}]*)\}/)?.[1] ?? '').matchAll(/"([^"]+)"/g)].map(
      ([, field]) => field,
    );
    const itemColumn = fields.indexOf('itemString');
    const rateColumn = fields.indexOf('regionSoldPerDay');
    if (!downloadTime || itemColumn < 0 || rateColumn < 0)
      throw new Error(`Unexpected TSM data layout for ${regionKey}`);
    const rates = [];
    const data = body.slice(body.indexOf('data={') + 6);
    for (const [, row] of data.matchAll(/\{([^{}]*)\}/g)) {
      const values = row.split(',');
      // Plain items only: "123" or "i:123"; pets and item variants are skipped.
      const item = values[itemColumn]?.replace(/^"?(?:i:)?/, '').replace(/"$/, '');
      if (!item || !/^\d+$/.test(item)) continue;
      // regionSoldPerDay is stored in thousandths.
      rates.push([Number(item), decode(values[rateColumn]) / 1000]);
    }
    blocks.push({ regionKey, downloadedAt: new Date(downloadTime * 1000), rates });
  }
  return blocks;
}

const byVersion = new Map();
for (const folder of await readdir(wowDir).catch(() => [])) {
  const file = resolve(wowDir, folder, 'Interface/AddOns/TradeSkillMaster_AppHelper/AppData.lua');
  if (!(await stat(file).catch(() => null))) continue;
  for (const block of regionSales(await readFile(file, 'utf8'))) {
    const version = versionFor(block.regionKey);
    const ageDays = (Date.now() - block.downloadedAt.getTime()) / 86_400_000;
    if (!version) {
      console.info(`Skipping ${block.regionKey} (${folder}): not a catalog Game version`);
      continue;
    }
    if (ageDays > MAX_AGE_DAYS) {
      console.info(`Skipping ${block.regionKey}: ${Math.floor(ageDays)} days old`);
      continue;
    }
    // EU and US rates for one version add up; the index serves both regions.
    const entry = byVersion.get(version) ?? {
      sources: [],
      downloadedAt: block.downloadedAt,
      rates: new Map(),
    };
    entry.sources.push(block.regionKey);
    if (block.downloadedAt < entry.downloadedAt) entry.downloadedAt = block.downloadedAt;
    for (const [item, rate] of block.rates)
      entry.rates.set(item, (entry.rates.get(item) ?? 0) + rate);
    byVersion.set(version, entry);
  }
}
if (!byVersion.size) throw new Error(`No recent TSM region sale data found under ${wowDir}`);

const uploads = [...byVersion].map(([version, entry]) => ({
  version,
  sources: entry.sources,
  downloadedAt: entry.downloadedAt.toISOString(),
  rates: [...entry.rates],
}));
for (const upload of uploads)
  console.info(
    `${upload.version}: ${upload.rates.length} items from ${upload.sources.join(', ')} (${upload.downloadedAt})`,
  );
if (dryRun) process.exit(0);
const response = await fetch(`${backend}/admin/search/sale-rates`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ uploads }),
});
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(`Upload failed (${response.status}): ${result.error ?? ''}`);
console.info(JSON.stringify(result, null, 2));
