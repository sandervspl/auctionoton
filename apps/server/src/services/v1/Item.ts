import * as i from 'types';
import { CACHE_MANAGER, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import fetch from 'node-fetch';
import _ from 'lodash';
import { Cache } from 'cache-manager';

import { convertToGSC } from 'utils/convertToGSC';
import scrapeItemHtml, { notFoundError } from 'utils/scrapeItemHtml';
import RetailService from 'services/v1/Retail';
import * as P from 'controllers/v1/Item/validation';


@Injectable()
export default class ItemService {
  constructor(
    private retailService: RetailService,
    @Inject(CACHE_MANAGER) private cacheMgr: Cache,
  ) {}

  private getCacheKey(serverSlug: string, factionSlug: string, id: string) {
    return `${serverSlug}_${factionSlug}_${id}`;
  }

  private ScrapeToItemResponse(data: i.ItemScrapeResponse, amount = 1): i.ItemResponse {
    return {
      ...data,
      minimumBuyout: convertToGSC(data.minimumBuyout, amount),
      historicalValue: convertToGSC(data.historicalValue, amount),
      marketValue: convertToGSC(data.marketValue, amount),
      amount,
    };
  }

  async findOne(params: P.FindOneParams): Promise<ClassicItemPrice | i.FetchError | void> {
    try {
      const serverSlug = decodeURI(params.server_name)
        .toLowerCase()
        .replace('\'', '')
        .replace(' ', '-');

      const factionSlug = params.faction.toLowerCase();

      // Check cache
      let data = await this.cacheMgr.get<i.ItemScrapeResponse>(
        this.getCacheKey(serverSlug, factionSlug, params.item_id),
      );

      // Fetch item data
      if (data == null) {
        const url =
          `https://nexushub.co/wow-classic/items/${serverSlug}-${factionSlug}/${params.item_id}`;
        const req = fetch(url).then(async (res) => await res.text());

        const raceCondition = new Promise<i.RaceConditionError>((res) => setTimeout(() => res({
          id: Number(params.item_id),
          error: true,
          reason: 'Timeout',
        }), 10000));

        // Promise race between page fetch and timer
        const result = await Promise.any([
          req,
          raceCondition,
        ]);

        // Return error
        if (typeof result !== 'string') {
          return result;
        }

        const scrapeResult = scrapeItemHtml(result);

        // Return error
        if (scrapeResult && 'error' in scrapeResult) {
          return notFoundError;
        }

        if (scrapeResult) {
          // Cache the HTML
          await this.cacheMgr.set(
            this.getCacheKey(serverSlug, factionSlug, params.item_id),
            scrapeResult,
            { ttl: 60 * 60 }, // Cache 1 hour
          );

          data = scrapeResult;
        }
      }

      // Return error
      if (!data) {
        return notFoundError;
      }

      // Multiply price values by amount
      const response = this.ScrapeToItemResponse(data, params.amount);

      return response;
    } catch (err) {
      throw new InternalServerErrorException('Error while fetching item.', JSON.stringify(err));
    }
  }

  async findMultiple(params: P.FindMultipleParams): Promise<Record<string, unknown>> {
    const itemStrArr = params.items.split('+');

    const requests = itemStrArr.map(async (str) => {
      const [id, amount = 1] = str.split(',');

      if (id) {
        const item = await this.findOne({
          server_name: params.server_name,
          faction: params.faction,
          item_id: id,
          amount: Number(amount),
        });

        return { ...item, amount: Number(amount) };
      }
    });

    const res = await Promise.all(requests);
    const items = res
      .filter((item): item is ClassicAllPricesItem => item != null);

    const response = this.multiplyCurrencyValues(items, 'name.slug');
    return response;
  }

  async retailFindOne(params: P.RetailFindOneParams): Promise<RetailItemPrice | i.FetchError> {
    const error: i.FetchError = {
      error: false,
      reason: '',
    };

    const CRID = await (async () => {
      if (isNaN(Number(params.server_name))) {
        const realms = await this.retailService.getAllRealms(params.region);
        const realm = realms[String(params.server_name).toLowerCase()];

        if (realm) {
          return realm.connectedRealmId;
        }
      } else {
        return Number(params.server_name);
      }
    })();

    if (!CRID) {
      error.error = true;
      error.reason = 'Retail realm not found';

      return error;
    }

    // const auctions = await this.retailService.getAllAuctionsForRealmId(params.region, CRID);

    // if (auctions) {
    //   return {
    //     lastUpdated: auctions.lastUpdated,
    //     ...auctions[Number(params.item_id)],
    //     id: Number(params.item_id),
    //   };
    // }

    throw new NotFoundException();
  }

  async retailFindMultiple(params: P.RetailFindMultipleParams): Promise<Record<string, unknown>> {
    const itemIdArr = params.items.split('+');

    const requests = itemIdArr.map(async (str) => {
      const [id, amount = 1] = str.split(',');

      const item = await this.retailFindOne({
        item_id: id!,
        region: params.region,
        server_name: params.server_name,
      });

      return {
        ...item,
        amount: Number(amount),
      };
    });

    const res = await Promise.all(requests);
    const items = res.filter((item): item is RetailAllPricesItem => item != null);
    const response = this.multiplyCurrencyValues(items, 'id');

    return response;
  }

  private multiplyCurrencyValues(
    allPrices: ClassicAllPrices | RetailAllPrices,
    responseItemKey: string,
  ) {
    const currencies = {};

    for (const item of allPrices) {
      if ('error' in item) {
        continue;
      }

      const itemDetails = (() => {
        if (item.__version === 'retail') {
          const { buyoutPrice, unitPrice, amount, __version, ...rest } = item;
          return { buyoutPrice, unitPrice, amount, __version, rest };
        } else {
          const { historicalValue, marketValue, minimumBuyout, amount, __version, ...rest } = item;
          return { historicalValue, marketValue, minimumBuyout, amount, __version, rest };
        }
      })();

      const prices = (() => {
        if (itemDetails.__version === 'retail') {
          const { buyoutPrice, unitPrice } = itemDetails;
          return { buyoutPrice, unitPrice };
        } else {
          const { historicalValue, marketValue, minimumBuyout } = itemDetails;
          return { historicalValue, marketValue, minimumBuyout };
        }
      })();

      const key = _.get(item, responseItemKey);
      _.set(currencies, key, { ...prices, ...itemDetails.rest, amount: itemDetails.amount });
    }

    return currencies;
  }
}

type ClassicItemPrice = {
  url: string;
  name: {
    slug: string;
    full: string;
  };
  icon: string;
  lastUpdated: string;
  marketValue: i.PriceObject;
  historicalValue: i.PriceObject;
  minimumBuyout: i.PriceObject;
  amount: number;
}

type RetailItemPrice = {
  lastUpdated: Date;
  quantity?: number;
  buyoutPrice?: Partial<i.PriceObject>;
  unitPrice?: Partial<i.PriceObject>;
  id: number;
}


type AllPricesItemBase<T, V = 'classic' | 'retail'> = (T & { amount: number, __version: V });

type RetailAllPricesItem = AllPricesItemBase<i.RetailItemPrice, 'retail'>;
type ClassicAllPricesItem = AllPricesItemBase<i.ClassicItemPrice, 'classic'>;
type AllPricesBase<T, V> = (AllPricesItemBase<T, V> | i.FetchError)[];

type RetailAllPrices = AllPricesBase<i.RetailItemPrice, 'retail'>;

type ClassicAllPrices = AllPricesBase<i.ClassicItemPrice, 'classic'>;
