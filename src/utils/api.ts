import * as i from 'types';
import produce from 'immer';

import { useStore } from 'state/store';

import asyncStorage from './asyncStorage';
import validateCache from './validateCache';


class Api {
  private requestController!: AbortController;

  /** Cancel the latest API request */
  public cancelRequest() {
    if (this.requestController) {
      this.requestController.abort();
    }
  }

  async getItem(itemName: string): Promise<i.CachedItemData | undefined> {
    // Get user data
    const user = useStore.getState().storage.user;

    // First check if data for this item is saved in storage
    const cachedItem = await asyncStorage.getItem(itemName);

    // Return cached data if it exists
    if (validateCache(cachedItem)) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log(`Retrieved ${itemName} data from cache`);
      }

      return cachedItem;
    }

    // Fetch item price data
    try {
      const server = user.server.slug.toLowerCase();
      const faction = user.faction.toLowerCase();

      this.requestController = new AbortController();
      const result = await fetch(`${__API__}/item/${server}/${faction}/${itemName}`, {
        signal: this.requestController.signal,
      });
      const data = await result.json() as i.CachedItemData;

      // Something went wrong
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((data as any).statusCode) {
        console.error(data);
        return;
      }

      const cachedData = produce(data, (draftState) => {
        draftState.updatedAt = new Date().getTime();
      });

      // Save data to storage
      await asyncStorage.addItem(itemName, cachedData);

      return cachedData;
    } catch (err) {
      if (__DEV__) {
        console.error(err);
      }
    }
  }
}

const api = new Api();

export default api;
