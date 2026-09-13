/** @typedef {import('next').NextConfig} NextConfig */
/** @typedef {import('webpack').Configuration} WebpackConfiguration */

/**
 * Set up our Next environment based on build phase
 * @param {string} phase
 * @param {NextConfig} config
 * @returns {NextConfig}
 */
const config = (phase, config) => {
  // Remove defaultConfig from config
  // This can not be included in the returned config
  const { defaultConfig, ...nextConfig } = config;

  /** @type {NextConfig} */
  const cfg = {
    ...nextConfig,
    // Remove x-powered-by header to remove information about the server
    poweredByHeader: false,
    reactStrictMode: false,
    basePath: '',
    devIndicators: {
      buildActivity: true,
      buildActivityPosition: 'bottom-left',
    },
    logging: {
      fetches: {
        fullUrl: true,
      },
    },
    images: {
      remotePatterns: [{ hostname: 'wow.zamimg.com' }, { hostname: 'render.worldofwarcraft.com' }],
    },
    // disable default in-memory caching.
    // This fixes an issue with multiple instances where 1 page remains stale while another is fresh
    // cacheMaxMemorySize: 0,
    async headers() {
      return [
        // Allow streaming by disabling buffering
        // https://nextjs.org/docs/app/building-your-application/deploying#streaming-and-suspense
        {
          source: '/:path*{/}?',
          headers: [
            {
              key: 'X-Accel-Buffering',
              value: 'no',
            },
          ],
        },
      ];
    },
  };

  return cfg;
};

module.exports = config;
