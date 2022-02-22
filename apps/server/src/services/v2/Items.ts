import * as i from 'types';
import type { ItemBody, ItemsBody } from '@project/validation';
import {
  CACHE_MANAGER, Inject, Injectable, InternalServerErrorException, NotFoundException, RequestTimeoutException,
} from '@nestjs/common';
import fetch from 'node-fetch';
import _ from 'lodash';
import { Cache } from 'cache-manager';
import immer, { Draft } from 'immer';

import { convertToGSCv2 } from '@project/utils';
import * as v from 'controllers/v2/Items/validation';


@Injectable()
export default class ItemsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheMgr: Cache,
  ) {}

  private getServerSlug(name: string) {
    return decodeURI(name)
      .toLowerCase()
      .replace('\'', '')
      .replace(' ', '-');
  }

  private getFactionSlug(faction: i.Factions) {
    return faction.toLowerCase();
  }

  private getCacheKey(serverSlug: string, factionSlug: string, id: string) {
    return `${serverSlug}_${factionSlug}_${id}`;
  }

  private nexushubToItemResponse(data: i.NexusHub.ItemsResponse, body: ItemBody): i.ItemResponseV2 {
    const datav2 = immer(data, (draft: Draft<i.ItemResponseV2>) => {
      draft.uri = '/items/' + draft.itemId;
      draft.stats.current = {
        numAuctions: data.stats.current?.numAuctions ?? 0,
        quantity: data.stats.current?.quantity ?? 0,
        minimumBuyout: convertToGSCv2(data.stats.current?.minBuyout, body.amount),
        historicalValue: convertToGSCv2(data.stats.current?.historicalValue, body.amount),
        marketValue: convertToGSCv2(data.stats.current?.marketValue, body.amount),
      };
      draft.stats.previous = {
        numAuctions: data.stats.previous?.numAuctions ?? 0,
        quantity: data.stats.previous?.quantity ?? 0,
        minimumBuyout: convertToGSCv2(data.stats.current?.minBuyout, body.amount),
        historicalValue: convertToGSCv2(data.stats.current?.historicalValue, body.amount),
        marketValue: convertToGSCv2(data.stats.current?.marketValue, body.amount),
      };
      draft.amount = body.amount || 1;
    }) as unknown as i.ItemResponseV2;

    return datav2;
  }

  item = async (
    params: v.ItemParams,
    body: ItemBody,
    query?: i.ItemRequestQuery,
  ): Promise<i.FetchError | (Partial<i.ItemResponseV2> | i.ItemResponseV2 | undefined)> => {
    // Transform to slugs for request
    const serverSlug = this.getServerSlug(body.server_name);
    const factionSlug = this.getFactionSlug(body.faction);

    // Check cache
    let data = await this.cacheMgr.get<i.NexusHub.ItemsResponse>(this.getCacheKey(serverSlug, factionSlug, params.id));

    // Fetch item data
    if (data == null) {
      const url = `https://api.nexushub.co/wow-classic/v1/items/${serverSlug}-${factionSlug}/${params.id}`;
      const req: Promise<i.NexusHub.ItemsResponse | i.NexusHub.ErrorResponse> =
        fetch(url).then(async (res) => await res.json());

      const raceCondition = new Promise<i.RaceConditionError>((res) => setTimeout(() => res({
        id: Number(params.id),
        error: true,
        reason: 'The request timed out. This could be due to a typo in the server name, faction or item id.' +
                ' It could also be that the service is slow to respond. You can try again in that case.',
      }), 10000));

      // Promise race between page fetch and timer
      const result = await Promise.any([req, raceCondition]);

      // Error
      if ('error' in result) {
        if (result.error === true) {
          throw new RequestTimeoutException(result);
        } else {
          throw new NotFoundException({
            id: Number(params.id),
            ...result,
          });
        }
      } else {
        // Cache the HTML
        await this.cacheMgr.set(
          this.getCacheKey(serverSlug, factionSlug, params.id),
          result,
          { ttl: 15 * 60 }, // Cache 15 min
        );

        data = result;
      }
    }

    // Multiply price values by amount
    const response = this.nexushubToItemResponse(data, body);

    if (query && typeof query.fields === 'string') {
      return _.pick(response, decodeURIComponent(query.fields).split(','));
    }

    return response;
  };

  items = async (
    body: ItemsBody,
    query?: i.ItemRequestQuery,
  ): Promise<(i.FetchError | Partial<i.ItemResponseV2> | i.ItemResponseV2 | undefined)[]> => {
    try {
      // Remove duplicates
      body.items = _.uniqBy(body.items, (item) => [item.id, item.server_name, item.faction].join());

      const fetches = [];
      for (const item of body.items) {
        const itemParams = {
          id: item.id.toString(),
        };

        const itemBody = {
          ...item,
          amount: item.amount || 1,
        };

        fetches.push(this.item(itemParams, itemBody, query));
      }

      const result = Promise.all(fetches);

      return result;
    } catch (err) {
      throw new InternalServerErrorException('Error while fetching items.', JSON.stringify(err));
    }
  };
}
