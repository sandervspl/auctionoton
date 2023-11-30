import { config } from 'dotenv';

config();

async function main() {
  const { updateDB } = await import('./update-db');
  await updateDB();
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
