import { insert } from './insert';
import { getAuctionDBFile } from './utils';

export async function updateDB() {
  try {
    const file = await getAuctionDBFile();
    await insert(file);
  } catch (err: any) {
    throw new Error(err.message);
  }
}
