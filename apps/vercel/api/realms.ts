import { db } from '@auctionoton/db';

export async function GET() {
  try {
    const realms = await db.query.realms.findMany();

    return new Response(JSON.stringify(realms), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=10800, s-maxage=3600, stale-while-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: true, message: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
        },
      },
    );
  }
}
