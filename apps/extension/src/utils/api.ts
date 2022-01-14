import * as i from 'types';
import type { ItemBody } from '@project/validation';
import { API } from '@project/constants';
import produce, { Draft } from 'immer';

import { useStore } from 'state/store';
import time from './time';


class Api {
  private requestController!: AbortController;

  /** Cancel the latest API request */
  public cancelRequest() {
    if (this.requestController) {
      this.requestController.abort();
    }
  }

  async getItem<V extends i.Versions, R = V extends 'classic' ? i.CachedItemDataClassic : i.CachedItemDataRetail>(
    version: V, itemId: number, onWarning: WarningCb, onError: ErrorCb,
  ): Promise<R | undefined> {
    type ItemData = V extends 'classic' ? i.ItemResponseV2 : i.ItemDataRetail;

    // Get user data
    const user = useStore.getState().storage.user;
    let timeoutId: NodeJS.Timeout | undefined;
    let url = '';

    this.requestController = new AbortController();
    const options: RequestInit = {
      signal: this.requestController.signal,
    };

    // Fetch latest data from server
    try {
      if (version === 'classic') {
        // Show warning of slow response time after x seconds
        timeoutId = setTimeout(() => {
          onWarning('The Auction House service is responding slowly. I will keep trying for a bit longer.');
        }, time.seconds(5));

        if (!user?.server?.classic || !user?.faction) {
          return;
        }

        const server = user.server.classic.slug.toLowerCase();
        const faction = user.faction[server].toLowerCase() as i.Factions;

        url = `${API.ItemsUrl}/${itemId}`;
        const body: ItemBody = {
          server_name: server,
          faction,
          amount: 1,
        };

        options.body = JSON.stringify(body);
        options.method = 'POST';
        options.headers = {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
        };
      }

      if (version === 'retail') {
        // Show warning of slow response time after x seconds
        timeoutId = setTimeout(() => {
          onWarning('Blizzard servers are responding slowly. I will keep trying for a bit longer.');
        }, time.seconds(5));

        if (!user?.server?.retail || !user?.region) {
          return;
        }

        const server = user.server.retail.name.toLowerCase();
        const region = user.region.toLowerCase();

        url = `${API.Url}/item/retail/${region}/${server}/${itemId}`;
      }

      const req = fetch(url, options).then((res) => {
        clearTimeout(timeoutId!);
        return res.json();
      });

      const timeout = new Promise((_, fail) => setTimeout(() => {
        if (version === 'classic') {
          fail('The data service is not responding.');
        } else {
          fail('Blizzard servers are not responding.');
        }
      }, time.seconds(10)));

      // Start request and fail timer parallel
      const data = await Promise.race([req, timeout]) as ItemData | i.ItemError;

      // Error
      if ('error' in data) {
        onWarning('');
        onError(data.reason);
      }

      // Success
      if ('buyoutPrice' in data || 'marketValue' in data) {
        const cachedData = produce(data as R, (draftState: Draft<i.AnyCachedItem>) => {
          // Set new last updated time
          if (data.lastUpdated !== 'Unknown') {
            draftState.updatedAt = new Date().getTime();
          }

          // Set discrimination key
          draftState.__version = version;
        });

        // Update UI
        onWarning('');
        onError('');

        // Return data to requester
        return cachedData;
      }
    // eslint-disable-next-line
    } catch (err: any) {
      if (__DEV__) {
        console.error(err);
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Update UI
      onWarning('');
      onError(err);

      // Return no item
      return undefined;
    }
  }

  async getRetailRealms(region?: i.Regions): Promise<i.RetailRealmResult | undefined> {
    if (!region) {
      return;
    }

    const url = `${API.Url}/retail/realms/${region}`;

    const result = await fetch(url);
    const data = await result.json();

    if (!('error' in data)) {
      return data;
    }
  }
}

type WarningCb = (text: string) => void;
type ErrorCb = (text: string) => void;

const api = new Api();

export default api;
