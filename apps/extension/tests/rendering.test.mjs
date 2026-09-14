import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { build } from 'esbuild';

const exec = promisify(execFile);

// Uses the agent-browser CLI and its installed Chromium. All network and storage stay local.
test(
  'real React portals survive sorting and host list replacement, and preserve missing reagents',
  { timeout: 60_000 },
  async () => {
    const extensionDir = fileURLToPath(new URL('..', import.meta.url));
    const bundle = await build({
      absWorkingDir: extensionDir,
      entryPoints: ['tests/fixtures/rendering.jsx'],
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      define: { 'process.env.NODE_ENV': '"development"', __DEV__: 'false' },
      tsconfig: 'tests/fixtures/tsconfig.json',
      plugins: [
        {
          name: 'local-browser-fixture',
          setup(builder) {
            builder.onResolve({ filter: /^wxt\/storage$/ }, () => ({
              path: 'storage',
              namespace: 'fixture',
            }));
            builder.onResolve({ filter: /api\.config$/ }, () => ({
              path: 'api',
              namespace: 'fixture',
            }));
            builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
              contents:
                path === 'api'
                  ? 'export const apiOrigin = window.location.origin;'
                  : 'export const storage = { async getItem(key) { const name = key.replace(/^local:/, ""); return (await browser.storage.local.get(name))[name] ?? null; } };',
            }));
          },
        },
      ],
    });
    const requests = [];
    const server = createServer((req, res) => {
      if (req.url === '/fixture.js') {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(bundle.outputFiles[0].contents);
      } else if (req.url.startsWith('/items/')) {
        const url = new URL(req.url, 'http://localhost');
        const ids = url.searchParams.get('ids').split(',').map(Number);
        requests.push({ ids, region: url.searchParams.get('region'), path: url.pathname });
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            items: ids
              .filter((id) => id !== 999)
              .map((itemId) => ({
                itemId,
                name: `Item ${itemId}`,
                uniqueName: `item-${itemId}`,
                stats: {
                  lastUpdated: new Date().toISOString(),
                  current: {
                    minBuyout: itemId * 100,
                    marketValue: 120,
                    historicalValue: 110,
                    quantity: 2,
                    numAuctions: 1,
                  },
                },
              })),
            missingItemIds: ids.filter((id) => id === 999),
          }),
        );
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.end(
          '<!doctype html><html><head><title>Extension rendering regression</title></head><body><script src="/fixture.js"></script></body></html>',
        );
      }
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const session = `auctionoton-rendering-${process.pid}`;
    const browser = (...args) =>
      exec('agent-browser', ['--session', session, ...args], {
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
      });
    try {
      await browser('set', 'viewport', '1600', '1200');
      await browser('open', `http://127.0.0.1:${server.address().port}/classic/items`);
      const { stdout } = await browser('eval', 'window.runRenderingChecks()');
      assert.deepEqual(JSON.parse(stdout), {
        visibleRows: 30,
        stableSorts: 3,
        replacement: true,
        reusedRow: true,
        missingReagent: true,
        cleanup: true,
      });
      assert.equal(
        requests.length,
        3,
        'Expected one initial batch, one changed item, and one missing reagent',
      );
      assert.deepEqual(
        requests[0].ids,
        Array.from({ length: 30 }, (_, i) => i + 1),
      );
      assert.deepEqual(
        requests.slice(1).map((request) => request.ids),
        [[31], [999]],
      );
      assert.ok(
        requests.every(
          (request) => request.region === 'eu' && request.path === '/items/ah/509/seasonal',
        ),
      );
      const { stdout: errors } = await browser('errors');
      assert.ok(!errors.trim() || errors.includes('No errors'), errors);
    } catch (error) {
      const { stdout: errors } = await browser('errors');
      throw new Error(`${error.message}\nBrowser errors: ${errors}`, { cause: error });
    } finally {
      await browser('close').catch(() => undefined);
      server.close();
      server.closeAllConnections();
    }
  },
);
