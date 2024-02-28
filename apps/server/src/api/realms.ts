import { kv } from '../kv';
import { getQueries } from '../utils';
import { getRealms, getRegions } from '../utils/tsm';

export const config = {
  runtime: 'edge',
  regions: ['sfo1'],
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

export async function realmService(req: Request, regionq: string, version: string) {
  const query = getQueries(req.url);
  const KV_KEY = `tsm:realms:${regionq}:${version}`;

  try {
    const cached = await kv.get<object[]>(KV_KEY);
    if (cached) {
      return cached;
    }

    const regions = await getRegions();
    const region = regions.find(
      (r) =>
        r.gameVersion === versionMap[version as keyof typeof versionMap] &&
        r.regionPrefix === regionq,
    );

    if (region == null) {
      return {
        error: true,
        status: 404,
        message: `Region "${region}" not found`,
      };
    }

    const realms = (await getRealms(region.regionId)).sort((a, b) =>
      a.localizedName.localeCompare(b.localizedName),
    );

    const data = realms.map((realm) => ({
      name: realm.name,
      localizedName: realm.localizedName,
      realmId: realm.realmId,
      auctionHouses: realm.auctionHouses,
    }));

    try {
      await kv.set(KV_KEY, data, { ex: 60 * 60 * 24 });
    } catch (error: any) {
      console.error('kv error:', error.message || 'unknown error');
    }

    return data;
  } catch (error: any) {
    return {
      error: true,
      status: 500,
      message: error.message || 'Unknown error',
    };
  }
}
