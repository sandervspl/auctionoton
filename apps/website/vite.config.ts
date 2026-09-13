import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Server libraries read runtime variables directly; only VITE_* is exposed to the browser.
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
    plugins: [
      tanstackStart(),
      ...(process.env.AUCTIONOTON_CLOUDFLARE === '1' ? [] : [nitro({ preset: 'node-server' })]),
      viteReact(),
    ],
    resolve: { tsconfigPaths: true },
    server: { port: 3001, strictPort: true },
  };
});
