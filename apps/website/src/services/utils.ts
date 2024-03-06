export const isServer = typeof window === 'undefined';

export const SITE_URL = {
  development: process.env.TEST_SITE_URL,
  acceptance: process.env.ACC_SITE_URL,
  production: process.env.PROD_SITE_URL,
}[process.env.APP_ENV];
