import { KEYS, kv } from '../kv';
import { getRealms, getRegions } from '../utils/tsm';
import * as i from '../types';

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

type Realm = {
  name: string;
  localizedName: string;
  realmId: number;
  auctionHouses: {
    auctionHouseId: number;
    type: 'Horde' | 'Alliance' | 'Neutral';
    lastModified: number;
  }[];
};

export async function realmService(regionq: i.Region, version: i.GameVersion) {
  const KV_KEY = KEYS.tsmRealmsVersion(regionq, version);

  try {
    const cached = await kv.get(KV_KEY);
    if (cached) {
      return JSON.parse(cached) as Realm[];
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
      await kv.set(KV_KEY, JSON.stringify(data), { EX: 60 * 60 * 24, NX: true });
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
