// Test-process-only Cloudflare bindings backed by real workerd D1 databases.
import { registerHooks } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const runtime = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("OK") } }',
    compatibilityDate: '2026-09-13',
    d1Databases: ['MARKET', 'USERS'],
    r2Buckets: ['SEARCH_INDEXES'],
  }),
);
export const env = {
  MARKET: await runtime.getD1Database('MARKET'),
  USERS: await runtime.getD1Database('USERS'),
  SEARCH_INDEXES: await runtime.getR2Bucket('SEARCH_INDEXES'),
};
for (const [binding, directory] of [
  ['MARKET', 'market'],
  ['USERS', 'auth'],
]) {
  const folder = new URL(`../../../cloudflare/migrations/${directory}/`, import.meta.url);
  for (const file of (await readdir(folder)).filter((file) => file.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(file, folder), 'utf8');
    // Use the same migrations as deployment. Statements execute as an atomic D1 batch.
    const statements = sql
      .replace(/^--.*$/gm, '')
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean);
    await env[binding].batch(statements.map((statement) => env[binding].prepare(statement)));
  }
}
await env.MARKET.prepare(`INSERT INTO item_metadata (id, name, slug)
  VALUES (2589, 'Linen Cloth', 'linen-cloth'), (2592, 'Wool Cloth', 'wool-cloth')`).run();
// A tiny Era search index, as rebuildSearchIndexes would write it.
export const SMOKE_INDEX_HASH = '0123456789abcdef';
await env.SEARCH_INDEXES.put(
  `search-index/era/${SMOKE_INDEX_HASH}.json`,
  JSON.stringify({
    format: 1,
    version: 'era',
    builtAt: '2026-11-27T00:00:00.000Z',
    idDeltas: [2589, 3],
    names: ['Linen Cloth', 'Wool Cloth'],
    qualities: [1, 1],
    icons: ['', ''],
    types: [0, 0],
    typeNames: ['Cloth'],
    popularity: [80, 50],
    slugs: {},
    synonyms: { items: [], words: [] },
  }),
);
await env.MARKET.prepare(
  "INSERT INTO search_indexes (version, hash, items, built_at) VALUES ('era', ?, 2, '2026-11-27T00:00:00.000Z')",
)
  .bind(SMOKE_INDEX_HASH)
  .run();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'cloudflare:workers') return { url: import.meta.url, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
