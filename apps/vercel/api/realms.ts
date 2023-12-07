import { kv } from '@vercel/kv';

import { getRealms, getRegions } from './_tsm.js';
import { getQueries } from './_utils.js';

export const config = {
  runtime: 'edge',
};

const versionMap = {
  era: 'Classic Era',
  hardcore: 'Classic Era - Hardcore',
  classic: 'Wrath',
  seasonal: 'Season of Discovery',
};

const headers = {
  'content-type': 'application/json',
  'cache-control': 'public, max-age=10800, s-maxage=3600, stale-while-revalidate',
  'Access-Control-Allow-Origin': '*',
};

export default async function handler(req: Request) {
  const query = getQueries(req.url);
  const regionq = query.get('region')!;
  const versionq = query.get('version')! as keyof typeof versionMap;
  const KV_KEY = `tsm:realms:${regionq}:${versionq}`;

  try {
    const cached = await kv.get<string>(KV_KEY);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers,
      });
    }

    const regions = await getRegions();
    const region = regions.find(
      (r) => r.gameVersion === versionMap[versionq] && r.regionPrefix === regionq,
    );

    if (!region) {
      return new Response(
        JSON.stringify({
          error: true,
          message: `Region "${regionq}" not found`,
        }),
        {
          status: 404,
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
          },
        },
      );
    }

    const realms = (await getRealms(region.regionId)).sort((a, b) =>
      a.localizedName.localeCompare(b.localizedName),
    );

    const data = JSON.stringify(
      realms.map((realm) => ({
        name: realm.name,
        localizedName: realm.localizedName,
        realmId: realm.realmId,
        auctionHouses: realm.auctionHouses,
      })),
    );

    try {
      await kv.set(KV_KEY, JSON.stringify(data), { ex: 60 * 60 * 24 });
    } catch (error: any) {
      console.error('kv error:', error.message || 'unknown error');
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers,
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
