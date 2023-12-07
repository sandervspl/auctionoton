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

export default async function handler(req: Request) {
  const query = getQueries(req.url);
  const regionq = query.get('region')!;
  const versionq = query.get('version')! as keyof typeof versionMap;

  try {
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

    const realmsRequests = [];

    realmsRequests.push(getRealms(region.regionId));

    if (versionq === 'era') {
      const hcRegion = regions.find(
        (r) => r.gameVersion === versionMap.hardcore && r.regionPrefix === regionq,
      );
      realmsRequests.push(getRealms(hcRegion!.regionId));

      const seasonalRegion = regions.find(
        (r) => r.gameVersion === versionMap.seasonal && r.regionPrefix === regionq,
      );
      realmsRequests.push(getRealms(seasonalRegion!.regionId));
    }

    const realmsResult = await Promise.all(realmsRequests);
    const realms = [...realmsResult]
      .flat()
      .sort((a, b) => a.localizedName.localeCompare(b.localizedName));

    return new Response(
      JSON.stringify(
        realms.map((realm) => ({
          name: realm.name,
          localizedName: realm.localizedName,
          realmId: realm.realmId,
        })),
      ),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=10800, s-maxage=3600, stale-while-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
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
