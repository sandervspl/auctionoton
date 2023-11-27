import { db } from '../db/index.js';

export const config = {
  runtime: 'experimental-edge',
};

export async function GET() {
  const realms = await db.query.realms.findMany();

  return new Response(JSON.stringify(realms), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=10800, s-maxage=3600, stale-while-revalidate',
    },
  });
}
