export const isServer = typeof window === 'undefined';

export const SITE_URL = {
  development: process.env.TEST_SITE_URL,
  acceptance: process.env.ACC_SITE_URL,
  production: process.env.PROD_SITE_URL,
}[process.env.APP_ENV];

export function convertToCoins(rawPrice: number, amount = 1) {
  const multiPrice = rawPrice * amount;
  const gold = Math.floor(multiPrice / 10000) || 0;
  const silver = Math.floor((multiPrice % 10000) / 100) || 0;
  const copper = multiPrice % 100 || 0;

  return { gold, silver, copper };
}
