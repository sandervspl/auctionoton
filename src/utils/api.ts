import * as i from 'types';

import asyncStorage from './asyncStorage';


class Api {
  async getItem(itemName: string): Promise<i.ItemData | undefined> {
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
    if (cachedItem) {
      const now = new Date().getTime();
      const hour = 3.6e6;

      // If it's less than an hour old, return cached data
      if (now - cachedItem.updatedAt < hour) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log(`Retrieved ${validName} data from cache`);
        }

        return cachedItem;
      }
    }

    // Fetch item price data
    try {
      const server = user.server.slug.toLowerCase();
      const faction = user.faction.toLowerCase();
      const item = validName.toLowerCase();

      const result = await fetch(`${__API__}/item/${server}/${faction}/${item}`);
      const data = await result.json() as i.ItemData | { statusCode: number; message: string };

      // Something went wrong
      if (!(data as i.ItemData).lastUpdated) {
        console.error(data);
        return;
      }

      const cachedData = {
        ...data as i.ItemData,
        updatedAt: new Date().getTime(),
      };

      // Save data to storage
      await asyncStorage.addItem(validName, cachedData);

      return data as i.ItemData;
    } catch (err) {
      console.error(err);
    }
  }
}

const api = new Api();

export default api;
