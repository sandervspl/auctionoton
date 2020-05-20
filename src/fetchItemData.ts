import * as i from './types';
import asyncStorage from './asyncStorage';

const fetchItemData = async (itemName: string): Promise<i.ItemData> => {
  // Get user data
  const { user } = await asyncStorage.get('user');

  // Fetch item price data
  const result = await fetch(`${process.env.API}/item/${user.server}/${user.faction}/${itemName}`);

  return await result.json();
};

export default fetchItemData;
