import { getAuctionDBFile } from './utils';

async function main() {
  try {
    const file = await getAuctionDBFile();
  } catch (err: any) {
    throw new Error(err.message);
  }
}

main()
  .then(() => {
    console.log('done');
    process.exit();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
