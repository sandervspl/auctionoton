// One API origin for development, packaged builds, host permissions, and the dev proxy.
export const apiOrigin = 'https://auctionoton-staging-backend.sandervispoel.workers.dev';

export const apiProxy = {
  '/realms/': { target: apiOrigin, changeOrigin: true },
  '/item/': { target: apiOrigin, changeOrigin: true },
};
