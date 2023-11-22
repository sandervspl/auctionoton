import fs from 'node:fs';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { fromZodError } from 'zod-validation-error';
import { z } from 'zod';
import * as R from 'remeda';

import { auctions, insertAuctionsSchema, insertItemsSchema, items, scanmeta } from './db/schema';

interface ItemEntry {
  ID: string;
  ShortID: number;
  Name: string;
  SellPrice: number;
  StackCount: number;
  ClassID: number;
  SubClassID: number;
  Rarity: number;
  MinLevel: number;
  Link: string;
  Olink: string;
}

interface AuctionEntry {
  TimeLeft: number;
  ItemCount: number;
  MinBid: number;
  Buyout: number;
  CurBid: number;
}

interface ScanEntry {
  dataFormatVersion: number;
  ts: number;
  realm: string;
  faction: string;
  char: string;
  Count: number;
  itemDBCount: number;
  itemsCount: number;
  data: string;
}

interface AHData {
  itemDB_2: Record<string, any>;
  ah: ScanEntry[];
}

const itemRegex =
  /^([0-9]+),([0-9]+),([0-9]+),([0-9]+),([0-9]+),([0-9]+)(\|[^|]+\|Hitem:([0-9]+)[^|]+\|h\[([^\]]+)\]\|h\|r)$/;

function extractItemInfo(id: string, olink: string): ItemEntry {
  const e: ItemEntry = { ID: id, Olink: olink } as ItemEntry;

  if (olink.length === 0 || olink[0] === '|') {
    return e;
  }

  const res = olink.match(itemRegex);

  if (!res) {
    console.error(`Unexpected mismatch for item ${olink}`);
    return e;
  }

  e.SellPrice = res[1] ? Number(res[1]) : 0;
  e.StackCount = res[2] ? Number(res[2]) : 0;
  e.ClassID = res[3] ? Number(res[3]) : 0;
  e.SubClassID = res[4] ? Number(res[4]) : 0;
  e.Rarity = res[5] ? Number(res[5]) : 0;
  e.MinLevel = res[6] ? Number(res[6]) : 0;
  e.ShortID = res[8] ? Number(res[8]) : 0;
  e.Link = res[7];
  e.Name = res[9];

  return e;
}

function extractAuctionData(auction: string): AuctionEntry {
  const split = auction.split(',');
  const splitI = split.map((item) => Number(item));

  return {
    TimeLeft: splitI[0],
    ItemCount: splitI[1],
    MinBid: splitI[2],
    Buyout: splitI[3],
    CurBid: splitI[4],
  };
}

async function ahDeserializeScanResult(
  scan: ScanEntry,
  scanID: number,
  items: Record<string, any>,
) {
  const data = scan.data;
  console.log(`Deserializing data length ${data.length}`);

  let numItems = 0;
  let addedCount = 0;
  const auctionsToAdd: z.infer<typeof insertAuctionsSchema>[] = [];

  const itemEntries = data.split(' ');
  for await (const itemEntry of itemEntries) {
    numItems += 1;

    const itemSplit = itemEntry.split('!');
    if (itemSplit.length !== 2) {
      console.error(`Couldn't split ${itemEntry} into 2 by '!': ${itemSplit}`);
    }

    const itemId = itemSplit[0];
    const rest = itemSplit[1];

    if (!items[itemId]) {
      continue;
    }

    // console.log(`for ${itemId} rest is '${rest}'`);

    const bySellerEntries = rest.split('!');

    for await (const sellerAuctions of bySellerEntries) {
      const sellerAuctionsSplit = sellerAuctions.split('/');
      const seller = sellerAuctionsSplit[0];
      const auctionsBySeller = sellerAuctionsSplit[1].split('&');

      // console.log(`seller ${seller} auctions are '${auctionsBySeller}'`);

      for await (const auction of auctionsBySeller) {
        const a = extractAuctionData(auction);

        const newAuction = insertAuctionsSchema.safeParse({
          scanId: scanID,
          itemId: itemId,
          timestamp: new Date(scan.ts * 1000).toISOString(),
          seller,
          timeLeft: a.TimeLeft,
          itemCount: a.ItemCount,
          minBid: a.MinBid,
          buyout: a.Buyout,
          curBid: a.CurBid,
        });
        if (!newAuction.success) {
          console.error(fromZodError(newAuction.error));
          continue;
        }

        auctionsToAdd.push(newAuction.data);
      }
    }
  }

  const CHUNK_SIZE = 1000;
  const chunks = R.chunk(auctionsToAdd, CHUNK_SIZE);

  for await (const chunk of chunks) {
    try {
      await db
        .insert(auctions)
        .values(chunk)
        .onConflictDoUpdate({
          target: [auctions.scanId, auctions.itemId, auctions.buyout],
          set: {
            scanId: sql`scanId`,
            itemId: sql`itemId`,
            timestamp: sql`ts`,
            seller: sql`seller`,
            buyout: sql`buyout`,
            curBid: sql`curBid`,
            id: sql`id`,
            itemCount: sql`itemCount`,
            minBid: sql`minBid`,
            timeLeft: sql`timeLeft`,
          },
        });
      addedCount += CHUNK_SIZE;
    } catch (err: any) {
      console.error(err.code, err.message);
    }
  }

  console.log(`Inserted ${addedCount} auctions for ${numItems} items for scanId ${scanID}`);
  if (numItems !== scan.itemsCount) {
    console.error(
      `Mismatch between deserialization item count ${numItems} and saved ${scan.itemsCount}`,
    );
  }
}

async function saveScans(scans: ScanEntry[], items: Record<string, any>) {
  for await (const entry of scans) {
    const newscanmeta = await db
      .insert(scanmeta)
      .values({
        realm: entry.realm,
        faction: entry.faction as 'Alliance' | 'Horde' | 'Neutral',
        scanner: entry.char,
        timestamp: new Date(entry.ts * 1000).toISOString(),
      })
      .onConflictDoUpdate({
        target: [scanmeta.timestamp, scanmeta.scanner],
        set: {
          scanner: entry.char,
          timestamp: new Date(entry.ts * 1000).toISOString(),
        },
      })
      .returning({ id: scanmeta.id });

    const newScanId = newscanmeta[0]?.id;

    if (!newScanId) {
      continue;
    }

    try {
      // await db.transaction(async () => {
      await ahDeserializeScanResult(entry, newScanId, items);
      // });
    } catch (err) {
      console.error(`Can't DB commit auction for scan "${newScanId}": ${err}`);
    }
  }
}

async function saveItems(_items: Record<string, any>) {
  const count = await db.run(sql`select count(*) from ${items}`);

  console.log(`ItemDB at start has ${count.rows[0][0]} items`);

  try {
    const start = Date.now();
    let bytes = 0;
    let addedCount = 0;
    const itemsToAdd: z.infer<typeof insertItemsSchema>[] = [];

    for (const k in _items) {
      const vi = _items[k];

      if (typeof vi !== 'string') {
        continue;
      }

      const v = vi as string;
      const lk = k.length;

      if (lk === 0) {
        console.warn(`Invalid empty key ${k} value ${v} in itemDB`);
        continue;
      }

      bytes += lk + v.length;

      const e = extractItemInfo(k, v);
      const newItem = insertItemsSchema.safeParse({
        id: e.ID,
        shortid: e.ShortID,
        name: e.Name,
        sellPrice: e.SellPrice,
        stackCount: e.StackCount,
        classId: e.ClassID,
        subclassId: e.SubClassID,
        rarity: e.Rarity,
        minLevel: e.MinLevel,
        link: e.Link,
        olink: e.Olink,
      });

      if (!newItem.success) {
        console.error(fromZodError(newItem.error));
        continue;
      }

      itemsToAdd.push(newItem.data);
    }

    const CHUNK_SIZE = 1000;
    const chunks = R.chunk(itemsToAdd, CHUNK_SIZE);

    for await (const chunk of chunks) {
      try {
        await db.insert(items).values(chunk).onConflictDoNothing();
        addedCount += CHUNK_SIZE;
      } catch (err: any) {
        console.error(err.code, err.message);
      }
    }

    const elapsed = Date.now() - start;

    console.log(
      `Inserted/updated ${addedCount} items, ${bytes / 1024 / 1024} Mbytes in DB in ${elapsed}ms`,
    );

    const count = await db.run(sql<number>`select count(*) from ${items}`);
    console.log(`ItemDB now has ${count.rows[0][0]} items`);
  } catch (err) {
    console.error(`Error during transaction: ${err}`);
  }
}

async function saveToDb(ahd: AHData) {
  await saveItems(ahd.itemDB_2);
  await saveScans(ahd.ah, ahd.itemDB_2);
}

function main() {
  const ahdb = JSON.parse(fs.readFileSync('db.json', 'utf8')) as AHData;
  saveToDb(ahdb);
}

main();
