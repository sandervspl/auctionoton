import * as i from './types';
import AsyncStorage from './asyncStorage';

abstract class API {
  static async fetchItemData(itemName: string): Promise<i.ItemData | undefined> {
    // First check if data for this item is saved in storage
    const cachedItem = await AsyncStorage.getItem(itemName);

    if (cachedItem) {
      const now = new Date().getTime();
      const hour = 3.6e6;

      // If it's less than an hour old, return cached data
      if (now - cachedItem.updatedAt < hour) {
        console.log(`Retrieved ${itemName} data from cache`);

        return cachedItem;
      }
    }

    // Get user data
    const user = await AsyncStorage.get('user');

    if (!user) {
      console.error('no user data found');

      return;
    }

    // Fetch item price data
    const result = await fetch(`${process.env.API}/item/${user.server}/${user.faction}/${itemName}`);
    const data = await result.json() as i.ItemData;

    const cachedData = {
      ...data,
      updatedAt: new Date().getTime(),
    };

    // Save data to storage
    await AsyncStorage.addItem({
      [itemName]: cachedData,
    });

    return data;
  }
}

export default API;
