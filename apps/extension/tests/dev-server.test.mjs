import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createServer } from 'wxt';
import { apiOrigin } from '../api.config.ts';

// Exercise WXT/Vite's actual routing without opening a browser or using provider credentials.
test(
  'development serves popup code with the staging API and proxies legacy localhost API paths',
  { timeout: 60000 },
  async () => {
    const upstream = createHttpServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ path: req.url }));
    });
    upstream.listen(0, '127.0.0.1');
    await once(upstream, 'listening');
    const target = `http://127.0.0.1:${upstream.address().port}`;
    let server;
    try {
      server = await createServer({
        runner: { disabled: true },
        dev: { server: { port: 3199 } },
        outDir: '.output/dev-test',
        hooks: {
          'vite:devServer:extendConfig': (config) => {
            for (const path of ['/realms/', '/item/', '/items/']) {
              const proxy = config.server?.proxy?.[path];
              assert.ok(proxy && typeof proxy === 'object', `Missing dev proxy for ${path}`);
              assert.equal(proxy.target, apiOrigin);
              // Only substitute the upstream; use the real project's routing configuration.
              proxy.target = target;
            }
          },
        },
      });
      await server.start();
      for (const path of [
        '/realms/eu/seasonal',
        '/realms/us/classic',
        '/item/2589/ah/509/seasonal',
        '/items/ah/509/seasonal?region=eu&ids=2589,2592',
      ]) {
        const response = await fetch(`${server.origin}${path}`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { path });
      }
      const module = await fetch(`${server.origin}/src/utils/auctionotonApi.ts`);
      assert.equal(module.status, 200);
      const source = await module.text();
      assert.match(source, /apiOrigin/);
      assert.doesNotMatch(source, /localhost:3000/);
      const config = await fetch(
        `${server.origin}/@fs${new URL('../api.config.ts', import.meta.url).pathname}`,
      );
      assert.equal(config.status, 200);
      assert.ok((await config.text()).includes(apiOrigin));
    } finally {
      await server?.stop();
      upstream.close();
      upstream.closeAllConnections();
    }
  },
);
