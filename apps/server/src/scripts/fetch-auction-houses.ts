import { updateAuctionHouseData } from '../api/item/auction-house';
import { realmService } from '../api/realms';
import * as i from '../types';

let errors = 0;
const MAX_ERRORS = 3;

for (const region of ['eu', 'us'] as i.Region[]) {
  // Too many realms to fetch them all, so we'll only fetch seasonal periodically
  for (const version of ['seasonal', 'era', 'classic', 'hardcore'] as i.GameVersion[]) {
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
          await updateAuctionHouseData(auctionHouse.auctionHouseId, version);
        } catch (err: any) {
          console.error(
            `Failed to update AH for "${realm.name}" (${region}-${version})...`,
            err.message,
          );

          if (++errors >= MAX_ERRORS) {
            console.error('Too many errors. Exiting.');
            process.exit(1);
          }
        }
      }
    }
  }
}

console.log('Done!');

process.exit();
