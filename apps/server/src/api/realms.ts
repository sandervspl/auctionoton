import { getRealms } from '../utils/tsm';
import * as i from '../types';

export const config = {
  runtime: 'edge',
  regions: ['sfo1'],
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
  try {
    const realms = (await getRealms(regionq, version)).sort((a, b) =>
      a.localizedName.localeCompare(b.localizedName),
    );

    const data = realms.map((realm) => ({
      name: realm.name,
      localizedName: realm.localizedName,
      realmId: realm.realmId,
      auctionHouses: realm.auctionHouses,
    }));

    return data;
  } catch (error: any) {
    return {
      error: true,
      status: 500,
      message: error.message || 'Unknown error',
    };
  }
}
