import { sql } from 'drizzle-orm';
import { fromZodError } from 'zod-validation-error';
import { z } from 'zod';
import * as R from 'remeda';

import {
  auctions,
  factions,
  insertAuctionsSchema,
  insertItemsSchema,
  insertItemsValuesSchema,
  insertScanmetaSchema,
  items,
  itemsValues,
  realms,
  scanmeta,
} from '../schema.js';
import { db } from '../index.js';

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

const CHUNK_SIZE = 2000;

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
  factionsData: { id: number; name: string }[],
  realmsData: { id: number; name: string }[],
) {
  console.log(`Deserializing data length ${scan.data.length}`);

  let numItems = 0;
  let addedCount = 0;
  const itemValues: {
    [realm: string]: {
      [faction: string]: {
        [itemId: string]: {
          minBuyout: number;
          quantity: number;
          numAuctions: number;
        };
      };
    };
  } = {
    Stitches: { Alliance: {}, Horde: {} },
    "Nek'Rosh": { Alliance: {}, Horde: {} },
  };
  const marketValues: {
    [itemId: string]: number[];
  } = {};
  const auctionsToAdd = new Set<string>();
  const itemsValuesToAdd = new Map<number, z.infer<typeof insertItemsValuesSchema>>();
  const itemEntries = scan.data.split(' ');

  console.info('Adding items_values...');
  console.time('Adding items_values total');
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

    if (!itemValues[scan.realm]?.[scan.faction]?.[itemId]) {
      itemValues[scan.realm] = {
        ...itemValues[scan.realm],
        [scan.faction]: {
          ...itemValues[scan.realm]?.[scan.faction],
          [itemId]: {
            minBuyout: 0,
            quantity: 0,
            numAuctions: 0,
          },
        },
      };
    }

    // console.log(`for ${itemId} rest is '${rest}'`);

    const bySellerEntries = rest.split('!');
    for await (const sellerAuctions of bySellerEntries) {
      const sellerAuctionsSplit = sellerAuctions.split('/');
      const seller = sellerAuctionsSplit[0];
      const auctionsBySeller = sellerAuctionsSplit[1].split('&');

      // console.log(`seller ${seller} auctions are '${auctionsBySeller.length}'`);

      for await (const auction of auctionsBySeller) {
        const a = extractAuctionData(auction);
        const timestamp = new Date(scan.ts * 1000).toISOString();

        const newAuction = insertAuctionsSchema.safeParse({
          scanId: scanID,
          itemId: itemId,
          timestamp,
          seller,
          timeLeft: a.TimeLeft,
          itemCount: a.ItemCount,
          minBid: a.MinBid,
          buyout: a.Buyout,
          curBid: a.CurBid,
        });
        if (!newAuction.success) {
          console.error('items_values::', fromZodError(newAuction.error).message);
          continue;
        }

        auctionsToAdd.add(
          `${scanID}_${itemId}_${timestamp}_${seller}_${a.TimeLeft}_${a.ItemCount}_${a.Buyout}_${a.MinBid}_${a.Buyout}_${a.CurBid}`,
        );

        const curItemValues = itemValues[scan.realm][scan.faction][itemId];
        itemValues[scan.realm][scan.faction][itemId].minBuyout =
          curItemValues.minBuyout > 0 ? Math.min(curItemValues.minBuyout, a.Buyout) : a.Buyout;
        itemValues[scan.realm][scan.faction][itemId].numAuctions += 1;
        itemValues[scan.realm][scan.faction][itemId].quantity += a.ItemCount;

        marketValues[itemId].push(a.Buyout);
      }
    }

    const curItemValues = itemValues[scan.realm][scan.faction][itemId];
    const itemShortId = Number(itemId.slice(1).split(/[?:]/)[0]);

    const marketValue =
      Math.round(
        marketValues[itemId].reduce((acc, cur) => acc + cur, 0) / marketValues[itemId].length,
      ) || curItemValues.minBuyout;
    delete marketValues[itemId];

    const realmId = realmsData.find(
      (realm) => realm.name.toLowerCase() === scan.realm.toLowerCase(),
    )?.id;
    const factionId = factionsData.find(
      (faction) => faction.name.toLowerCase() === scan.faction.toLowerCase(),
    )?.id;

    const insertValues = insertItemsValuesSchema.safeParse({
      quantity: curItemValues.quantity,
      historicalValue: 0,
      marketValue: marketValue,
      minBuyout: curItemValues.minBuyout,
      numAuctions: curItemValues.numAuctions,
      itemShortid: itemShortId,
      realm: realmId,
      faction: factionId,
    });

    if (insertValues.success) {
      itemsValuesToAdd.set(itemShortId, insertValues.data);
    } else {
      console.error('items_values::', fromZodError(insertValues.error).message);
    }
  }

  // Add items_values
  const itemsValuesChunks = R.chunk(
    Array.from(itemsValuesToAdd).map(([, value]) => value),
    CHUNK_SIZE,
  );
  console.log(`Adding ${itemsValuesToAdd.size} items_values in ${itemsValuesChunks.length} chunks`);

  for await (const chunk of itemsValuesChunks) {
    console.time('Adding items_values...');
    try {
      await db.insert(itemsValues).values(chunk).onConflictDoNothing();
    } catch (err: any) {
      console.error(err.code, err.message);
    }
    console.timeEnd('Adding items_values...');
  }
  console.timeEnd('Adding items_values total');

  // Add auctions
  const uniqueAuctions = Array.from(auctionsToAdd)
    .map((str) => str.split('_'))
    .reduce((acc, cur) => {
      const [scanId, itemId, timestamp, seller, timeLeft, itemCount, minBid, buyout, curBid] = cur;
      const newAuction = insertAuctionsSchema.safeParse({
        scanId: Number(scanId),
        itemId: itemId,
        timestamp,
        seller,
        timeLeft: Number(timeLeft),
        itemCount: Number(itemCount),
        minBid: Number(minBid),
        buyout: Number(buyout),
        curBid: Number(curBid),
      });

      if (!newAuction.success) {
        console.error('auctions::', fromZodError(newAuction.error).message);
        return acc;
      }

      acc.push(newAuction.data);

      return acc;
    }, [] as z.infer<typeof insertAuctionsSchema>[]);
  const chunks = R.chunk(uniqueAuctions, CHUNK_SIZE);
  console.log(`Adding ${uniqueAuctions.length} auctions in ${chunks.length} chunks`);

  console.info('Adding auctions...');
  console.time('Adding auctions total');
  for await (const chunk of chunks) {
    console.time('Adding auctions...');
    try {
      await db.insert(auctions).values(chunk).onConflictDoNothing();
      addedCount += chunk.length;
    } catch (err: any) {
      console.error(err.code, err.message);
    }
    console.timeEnd('Adding auctions...');
  }
  console.timeEnd('Adding auctions total');

  console.log(`Inserted ${addedCount} auctions for ${numItems} items for scanId ${scanID}`);
  if (numItems !== scan.itemsCount) {
    console.error(
      `Mismatch between deserialization item count ${numItems} and saved ${scan.itemsCount}`,
    );
  }
}

async function saveScans(scans: ScanEntry[], items: Record<string, any>) {
  try {
    const [factionsData, realmsData, scansData] = await Promise.all([
      db.select().from(factions).all(),
      db.select().from(realms).all(),
      db.select().from(scanmeta).all(),
    ]);

    for await (const scan of scans) {
      if (scansData.some((s) => s.timestamp === new Date(scan.ts * 1000).toISOString())) {
        console.log(
          `Scan for ${scan.realm} ${scan.faction} ${scan.char} ${scan.ts} already exists`,
        );

        continue;
      }

      console.info(`Saving scan for ${scan.realm} ${scan.faction} ${scan.char} ${scan.ts}...`);

      const scanmetaValues = insertScanmetaSchema.safeParse({
        realm: realmsData.find((realm) => realm.name.toLowerCase() === scan.realm.toLowerCase())
          ?.id,
        faction: factionsData.find(
          (faction) => faction.name.toLowerCase() === scan.faction.toLowerCase(),
        )?.id,
        scanner: scan.char,
        timestamp: new Date(scan.ts * 1000).toISOString(),
      });

      if (!scanmetaValues.success) {
        throw new Error(fromZodError(scanmetaValues.error).message);
      }

      const newscanmeta = await db
        .insert(scanmeta)
        .values(scanmetaValues.data)
        .onConflictDoUpdate({
          target: [scanmeta.timestamp, scanmeta.scanner],
          set: {
            scanner: scan.char,
            timestamp: new Date(scan.ts * 1000).toISOString(),
          },
        })
        .returning({ id: scanmeta.id });

      const newScanId = newscanmeta[0]?.id;

      if (!newScanId) {
        continue;
      }

      await ahDeserializeScanResult(scan, newScanId, items, factionsData, realmsData);
      console.log('\n----------------\n');
    }
  } catch (err) {
    console.error(`Error during "saveScans": ${err}`);
  }
}

async function saveItems(_items: Record<string, any>) {
  try {
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
        console.error(fromZodError(newItem.error).message);
        continue;
      }

      itemsToAdd.push(newItem.data);
    }

    const chunks = R.chunk(itemsToAdd, CHUNK_SIZE);
    console.info(`Adding ${itemsToAdd.length} items in ${chunks.length} chunks...`);
    console.time('Adding items total');

    for await (const chunk of chunks) {
      console.time('Adding items...');
      try {
        await db.insert(items).values(chunk).onConflictDoNothing();
        addedCount += chunk.length;
      } catch (err: any) {
        console.error('items::', err.code, err.message);
      }
      console.timeEnd('Adding items...');
    }
    console.timeEnd('Adding items total');

    console.log(`Upserted ${addedCount} items, ${bytes / 1024 / 1024} Mbytes in DB`);
  } catch (err) {
    console.error(`Error during transaction: ${err}`);
  }
}

async function main() {
  const ahdb = JSON.parse(await Bun.file('db.json').text()) as AHData;

  await saveItems(ahdb.itemDB_2);
  console.log('\n----------------\n');
  await saveScans(ahdb.ah, ahdb.itemDB_2);
}

main();
