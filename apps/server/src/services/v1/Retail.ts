import * as i from 'types';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Cache from 'node-cache';
import { BlizzAPI, RegionName } from 'blizzapi';

import time from 'utils/time';
import { CACHE_KEYS } from 'utils/constants';
import { convertToGSC } from 'utils/convertToGSC';


type FlatAuctions = {
  lastUpdated: Date;
  [itemId: number]: {
    quantity: number;
    buyoutPrice: Partial<i.PriceObject>;
    unitPrice: i.PriceObject;
  };
}

type FlatRealmIndex = {
  [EN_USRealmName: string]: {
    realmId: number;
    connectedRealmId: number;
  };
}


@Injectable()
export default class RetailService {
  private cache = new Cache({
    stdTTL: time.hours(24) / 1000,
    deleteOnExpire: false,
  });

  constructor() {
    this.cache.on('expired', (strKey: string) => {
      const cache: i.CacheKeys = JSON.parse(strKey);

      // Refresh realm list
      if (cache.__key === 'realms') {
        this.getAllRealms(cache.region, true);
      }

      // Refresh auctions
      if (cache.__key === 'auctions') {
        // const { region, connectedRealmId } = cache;
        // this.getAllAuctionsForRealmId(region, connectedRealmId, true);
      }
    });
  }

  async getAllRealms(region: RegionName, force?: boolean): Promise<FlatRealmIndex> {
    if (!force && this.cache.has(CACHE_KEYS.Realms({ region }))) {
      return this.cache.get(CACHE_KEYS.Realms({ region }))!;
    }

    // Request new realm index
    const blizzAPI = this.getBlizzardApiInstance(region);

    const params = {
      // 'realms.timezone': 'Europe/Paris',
      namespace: `dynamic-${region}`,
      orderby: 'id',
      _page: 1,
    };

    const realmIndex = await blizzAPI.query<i.RealmIndexSearchResponse>('/data/wow/search/connected-realm', {
      params,
    });

    if ('error' in realmIndex) {
      throw new InternalServerErrorException();
    }

    // Flatten object for easier/faster lookup after caching
    const flatRealmIndex: FlatRealmIndex = {};

    for (const result of realmIndex.results) {
      for (const realm of result.data.realms) {
        flatRealmIndex[realm.name.en_US.toLowerCase()] = {
          connectedRealmId: Number(result.key.href.match(/\d+/)?.[0]),
          realmId: realm.id,
        };
      }
    }

    this.cache.set(CACHE_KEYS.Realms({ region }), flatRealmIndex);

    return flatRealmIndex;
  }

  async getAllAuctionsForRealmId(region: RegionName, connectedRealmId: number, force?: boolean) {
    if (!force && this.cache.has(CACHE_KEYS.Auctions({ region, connectedRealmId }))) {
      return this.cache.get<FlatAuctions>(CACHE_KEYS.Auctions({ region, connectedRealmId }));
    }

    const blizzAPI = this.getBlizzardApiInstance(region);

    const params = {
      region,
      connectedRealmId,
      namespace: `dynamic-${region}`,
    };
    const auctions = await blizzAPI.query<i.AuctionHouseSearchResponse>(
      `/data/wow/connected-realm/${connectedRealmId}/auctions`,
      {
        params,
      },
    );

    if ('error' in auctions) {
      throw new InternalServerErrorException();
    }

    const flatAuctions: FlatAuctions = {
      lastUpdated: new Date(auctions.lastModified),
    };

    // Flatten object for easier/faster lookup after caching
    for (const auction of auctions.auctions) {
      flatAuctions[auction.item.id] = {
        quantity: auction.quantity,
        buyoutPrice: convertToGSC(auction.buyout || 0),
        unitPrice: convertToGSC(auction.unit_price),
      };
    }

    this.cache.set(
      CACHE_KEYS.Auctions({ region, connectedRealmId }),
      flatAuctions,
      time.hours(2) / 1000,
    );

    return flatAuctions;
  }


  private getBlizzardApiInstance(region: RegionName): BlizzAPI {
    if (!process.env.BNET_CLIENT_ID || !process.env.BNET_CLIENT_SECRET) {
      throw new Error('no BNET Client ID or Client Secret found');
    }

    return new BlizzAPI({
      region,
      clientId: process.env.BNET_CLIENT_ID,
      clientSecret: process.env.BNET_CLIENT_SECRET,
    });
  }
}
