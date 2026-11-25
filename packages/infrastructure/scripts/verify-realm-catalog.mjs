// Checks that every auction house in the realm catalog has a TSM public CSV file.
// Usage: node packages/infrastructure/scripts/verify-realm-catalog.mjs
// public-data.tradeskillmaster.com is TSM's designated host for automated access; do not point
// this script at tradeskillmaster.com, whose robots.txt disallows automated tools.
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(
  readFileSync(new URL('../../../apps/cloudflare/src/realm-catalog.json', import.meta.url), 'utf8'),
);
const origin = 'https://public-data.tradeskillmaster.com';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const failures = [];
let checked = 0;
for (const [version, regions] of Object.entries(catalog)) {
  for (const [region, { path, realms }] of Object.entries(regions)) {
    for (const realm of realms) {
      for (const house of realm.auctionHouses) {
        const url = `${origin}/${path}/realm/${realm.slug}-${house.type.toLowerCase()}/items.csv`;
        const response = await fetch(url, { method: 'HEAD' });
        checked++;
        if (response.status !== 200)
          failures.push(
            `${version}/${region} ${realm.name} ${house.type}: HTTP ${response.status} ${url}`,
          );
        await sleep(100);
      }
    }
  }
}
console.log(`Checked ${checked} auction houses.`);
if (failures.length) {
  console.error(`Missing public CSV files:\n  ${failures.join('\n  ')}`);
  process.exitCode = 1;
}
