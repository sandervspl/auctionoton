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
    [itemId: string]: number;
  } = {};
  const auctionsToAdd: z.infer<typeof insertAuctionsSchema>[] = [];

  const itemEntries = scan.data.split(' ');
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

    if (!itemValues[scan.realm][scan.faction][itemId]) {
      itemValues[scan.realm][scan.faction][itemId] = {
        minBuyout: 0,
        quantity: 0,
        numAuctions: 0,
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
          console.error(fromZodError(newAuction.error).message);
          continue;
        }

        auctionsToAdd.push(newAuction.data);

        const curItemValues = itemValues[scan.realm][scan.faction][itemId];
        itemValues[scan.realm][scan.faction][itemId].minBuyout =
          curItemValues.minBuyout > 0 ? Math.min(curItemValues.minBuyout, a.Buyout) : a.Buyout;
        itemValues[scan.realm][scan.faction][itemId].numAuctions += 1;
        itemValues[scan.realm][scan.faction][itemId].quantity += a.ItemCount;
      }
    }

    const curItemValues = itemValues[scan.realm][scan.faction][itemId];
    const itemShortId = Number(itemId.slice(1).split(/[?:]/)[0]);
    const marketValue =
      marketValues[itemShortId] > 0
        ? Math.min(curItemValues.minBuyout, marketValues[itemShortId])
        : curItemValues.minBuyout;

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
      await db
        .insert(itemsValues)
        .values(insertValues.data)
        .onConflictDoUpdate({
          set: insertValues.data,
          target: [
            itemsValues.itemShortid,
            itemsValues.timestamp,
            itemsValues.realm,
            itemsValues.faction,
          ],
        });
    } else {
      console.error(fromZodError(insertValues.error).message);
    }
  }

  const CHUNK_SIZE = 1000;
  const chunks = R.chunk(auctionsToAdd, CHUNK_SIZE);

  for await (const chunk of chunks) {
    try {
      await db.insert(auctions).values(chunk);
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
  try {
    const [factionsData, realmsData, scansData] = await Promise.all([
      db.select().from(factions).all(),
      db.select().from(realms).all(),
      db.select().from(scanmeta).all(),
    ]);

    for await (const scan of scans) {
      if (scansData.some((s) => s.timestamp === new Date(scan.ts * 1000).toISOString())) {
        continue;
      }

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

      try {
        await ahDeserializeScanResult(scan, newScanId, items, factionsData, realmsData);
      } catch (err) {
        console.error(`Can't DB commit auction for scan "${newScanId}": ${err}`);
      }
    }
  } catch (err) {
    console.error(`Error during "saveScans": ${err}`);
  }
}

async function saveItems(_items: Record<string, any>) {
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
        console.error(fromZodError(newItem.error).message);
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
  } catch (err) {
    console.error(`Error during transaction: ${err}`);
  }
}

async function main() {
  const ahdb = JSON.parse(await Bun.file('db.json').text()) as AHData;

  await saveItems(ahdb.itemDB_2);
  await saveScans(ahdb.ah, ahdb.itemDB_2);
}

console.log('Starting...');
main();
