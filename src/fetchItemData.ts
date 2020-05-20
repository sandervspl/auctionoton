import * as i from './types';
import AsyncStorage from './asyncStorage';

const fetchItemData = async (itemName: string): Promise<i.ItemData | undefined> => {
  // First check if data for this item is saved in storage
  const cachedItem = await AsyncStorage.getItem(itemName);

  if (cachedItem) {
    return cachedItem;
  }

  // Get user data
  const user = await AsyncStorage.get('user');

  if (!user) {
    return;
  }

  // Fetch item price data
  const result = await fetch(`${process.env.API}/item/${user.server}/${user.faction}/${itemName}`);

  const data = await result.json() as i.ItemData;

  // Save data to storage
  await AsyncStorage.addItem({
    [itemName]: data,
  });

  return data;
};

export default fetchItemData;
