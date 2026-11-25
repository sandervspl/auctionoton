// API origins for the extension. Release builds (`wxt build|zip`, mode "production") use the
// production backend; `wxt` dev builds and tests use staging.
export const stagingOrigin = 'https://auctionoton-staging-backend.sandervispoel.workers.dev';
// Also named in the extension's host permissions: changing it makes Chrome disable installed
// copies until users re-approve the extension.
export const productionOrigin = 'https://auctionoton-api.sandervspl.dev';

export const apiOriginFor = (mode: string | undefined) =>
  mode === 'production' ? productionOrigin : stagingOrigin;

// Vite replaces import.meta.env in extension bundles; Node (WXT config, tests) has none.
export const apiOrigin = apiOriginFor((import.meta as { env?: { MODE?: string } }).env?.MODE);

// The dev server only runs in development, so its proxy always targets staging.
export const apiProxy = {
  '/realms/': { target: stagingOrigin, changeOrigin: true },
  '/item/': { target: stagingOrigin, changeOrigin: true },
  '/items/': { target: stagingOrigin, changeOrigin: true },
};
