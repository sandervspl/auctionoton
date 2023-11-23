import { parse } from 'lua-json';

const file = await Bun.file('./db/scripts/input/AuctionDB.lua').text();

await Bun.write(
  'db.json',
  JSON.stringify(parse(file.replace('AuctionDBSaved =', 'return ')), null, 2),
);
