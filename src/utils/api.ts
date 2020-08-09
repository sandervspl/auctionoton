import * as i from 'types';
import produce from 'immer';

import asyncStorage from './asyncStorage';
import validateCache from './validateCache';


class Api {
  async getItem(itemName: string): Promise<i.CachedItemData | undefined> {
    const validName = decodeURI(itemName)
      .replace(' ', '-')
      .replace(/[^-a-zA-Z0-6]/g, '')
      .trim();

    // Get user data
    const user = await asyncStorage.get('user');

    if (!user) {
      console.error('no user data found');

      return;
    }

    // First check if data for this item is saved in storage
    const cachedItem = await asyncStorage.getItem(validName);

    // Return cached data if it exists
    if (validateCache(cachedItem)) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log(`Retrieved ${validName} data from cache`);
      }

      return cachedItem;
    }

    // Fetch item price data
    try {
      const server = user.server.slug.toLowerCase();
      const faction = user.faction.toLowerCase();
      const item = validName.toLowerCase();

      const result = await fetch(`${__API__}/item/${server}/${faction}/${item}`);
      const data = await result.json() as i.CachedItemData;

      // Something went wrong
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(data as any).statusCode) {
        console.error(data);
        return;
      }

      const cachedData = produce(data, (draftState) => {
        draftState.updatedAt = new Date().getTime();
      });

      // Save data to storage
      await asyncStorage.addItem(validName, cachedData);

      return cachedData;
    } catch (err) {
      console.error(err);
    }
  }
}

const api = new Api();

export default api;
