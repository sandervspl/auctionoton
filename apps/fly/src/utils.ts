import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'lua-json';

if (!process.env.BLOB_URL) {
  throw new Error('BLOB_URL is not set');
}

export async function getAuctionDBFile() {
  const secret = process.env.AUC_SECRET;

  if (!secret) {
    throw new Error('Unauthorized');
  }

  if (process.env.NODE_ENV === 'production') {
    console.info('Downloading AuctionDB file...');

    console.time('Downloaded AuctionDB file');
    const response = await fetch(`${process.env.BLOB_URL}/AuctionDB.lua?secret=${secret}`);
    const data = await response.text();
    console.timeEnd('Downloaded AuctionDB file');

    const json = lua2json(data);

    return json;
  } else {
    const data = await fs.readFile(path.join(process.cwd(), 'src/input/AuctionDB.lua'), 'utf-8');
    const json = lua2json(data);

    return json;
  }
}

export function lua2json(file: string) {
  return JSON.stringify(parse(file.replace('AuctionDBSaved =', 'return ')), null, 2);
}
