import '@tanstack/react-start/server-only';

export function getSiteUrl() {
  const siteUrl = {
    development: process.env.TEST_SITE_URL,
    acceptance: process.env.ACC_SITE_URL,
    production: process.env.PROD_SITE_URL,
  }[process.env.APP_ENV];
  return new URL(siteUrl || 'http://localhost:3001').origin;
}
