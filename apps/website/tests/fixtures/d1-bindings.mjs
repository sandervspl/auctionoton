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
  }),
);
export const env = {
  MARKET: await runtime.getD1Database('MARKET'),
  USERS: await runtime.getD1Database('USERS'),
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
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'cloudflare:workers') return { url: import.meta.url, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
