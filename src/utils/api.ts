import * as i from '../types';
import AsyncStorage from './asyncStorage';

// CLEAR STORAGE
// AsyncStorage.set({ items: {} });

class API {
  async getItem(itemName: string): Promise<i.ItemData | undefined> {
    // Get user data
    const user = await AsyncStorage.get('user');

    if (!user) {
      console.error('no user data found');

      return;
    }

    // First check if data for this item is saved in storage
    const cachedItem = await AsyncStorage.getItem(itemName, user.server.slug, user.faction);

    // Return cached data if it exists
    if (cachedItem) {
      const now = new Date().getTime();
      const hour = 3.6e6;

      // If it's less than an hour old, return cached data
      if (now - cachedItem.updatedAt < hour) {
        // eslint-disable-next-line no-console
        console.log(`Retrieved ${itemName} data from cache`);

        return cachedItem;
      }
    }

    // Fetch item price data
    try {
      const server = user.server.slug.toLowerCase();
      const faction = user.faction.toLowerCase();
      const item = itemName.toLowerCase();

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
      await AsyncStorage.addItem(
        { [itemName]: cachedData },
        user.server.slug,
        user.faction,
      );

      return data as i.ItemData;
    } catch (err) {
      console.error(err);
    }
  }
}

const api = new API();

export default api;
