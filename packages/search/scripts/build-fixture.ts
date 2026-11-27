// Builds tests/fixtures/era-index.json: the real Blizzard catalog filtered to items listed on at
// least one Era realm, with Popularity from those listings. Golden-query and benchmark tests run
// against it. Usage: node packages/search/scripts/build-fixture.ts
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { encodeIndex, slugify, type SearchItem } from '../src/index.ts';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const env = {
  ...parseEnv(
    await readFile(resolve(root, 'packages/infrastructure/.env'), 'utf8').catch(() => ''),
  ),
  ...process.env,
};
const catalog = JSON.parse(
  await readFile(resolve(root, 'apps/cloudflare/src/realm-catalog.json'), 'utf8'),
);

const token = await fetch('https://eu.battle.net/oauth/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(`${env.BNET_CLIENT_ID}:${env.BNET_CLIENT_SECRET}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials',
}).then((response) => response.json());

const items = new Map<number, Omit<SearchItem, 'popularity'>>();
for (let cursor = 1; ; ) {
  const query = new URLSearchParams({
    namespace: 'static-classic1x-eu',
    locale: 'en_US',
    _pageSize: '1000',
    orderby: 'id',
    id: `[${cursor},]`,
  });
  const page = await fetch(`https://eu.api.blizzard.com/data/wow/search/item?${query}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  }).then((response) => response.json());
  for (const { data } of page.results) {
    items.set(data.id, {
      id: data.id,
      name: data.name.en_US,
      slug: '',
      icon: '',
      quality:
        { POOR: 0, COMMON: 1, UNCOMMON: 2, RARE: 3, EPIC: 4, LEGENDARY: 5 }[
          data.quality?.type as string
        ] ?? 1,
      type: data.item_subclass?.name?.en_US ?? null,
    });
    cursor = data.id + 1;
  }
  console.info(`Catalog: ${items.size}`);
  if (page.results.length < 1000) break;
}

const popularity = new Map<number, number>();
for (const region of ['eu', 'us']) {
  const entry = catalog.era[region];
  for (const realm of entry.realms) {
    const seen = new Set<number>();
    for (const house of realm.auctionHouses) {
      const url = `https://public-data.tradeskillmaster.com/${entry.path}/realm/${realm.slug}-${house.type.toLowerCase()}/items.csv`;
      const response = await fetch(url);
      if (!response.ok) continue;
      for (const line of (await response.text()).split('\n').slice(1)) {
        const id = Number(line.slice(0, line.indexOf(',')));
        if (Number.isSafeInteger(id) && id > 0) seen.add(id);
      }
    }
    for (const id of seen) popularity.set(id, (popularity.get(id) ?? 0) + 1);
  }
  console.info(`Swept era ${region}`);
}

const searchable = [...items.values()]
  .filter((item) => popularity.has(item.id))
  .map((item) => ({ ...item, slug: slugify(item.name), popularity: popularity.get(item.id)! }));
const file = encodeIndex('era', new Date().toISOString(), searchable, { items: [], words: [] });
await writeFile(
  fileURLToPath(new URL('../tests/fixtures/era-index.json', import.meta.url)),
  `${JSON.stringify(file)}\n`,
);
console.info(`Wrote ${searchable.length} searchable items`);
