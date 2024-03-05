import { updateAuctionHouseData } from '../api/item/auction-house';
import { realmService } from '../api/realms';

for (const region of ['eu', 'us']) {
  // 'classic' has too many realms for the free TSM API
  for (const version of ['seasonal']) {
    console.log(`Fetching realms for "${region}-${version}"...`);
    const realms = await realmService(region, version);

    if ('error' in realms) {
      console.error('Error fetching realms:', realms.status, realms.message);
      process.exit(1);
    }

    for await (const realm of realms) {
      console.log(`Fetching AH for "${realm.name}" (${region}-${version})...`);

      for await (const auctionHouse of realm.auctionHouses) {
        try {
          await updateAuctionHouseData(auctionHouse.auctionHouseId);
        } catch (err: any) {
          console.error(
            `Failed to update AH for "${realm.name}" (${region}-${version})...`,
            err.message,
          );
        }
      }
    }
  }
}

console.log('Done!');

process.exit();
