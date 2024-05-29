import { and, eq, desc } from 'drizzle-orm';
import slugify from '@sindresorhus/slugify';
import dayjs from 'dayjs';

import * as i from '../../types';
import { createDbClient } from '../../db';
import { items, itemsMetadata } from '../../db/schema';
import { getItemFromBnet } from '../../utils/blizzard/index.ts';
import { qualityMap } from '../../utils';
import { getAuctionHouse, getItem } from '../../utils/tsm';
import { Item } from '../../types/tsm';

export async function itemService(itemId: number, auctionHouseId: number, version: i.GameVersion) {
  const item = await queryItem(itemId, auctionHouseId, version);

  return (
    item ?? {
      error: true,
      reason: 'Item not found',
    }
  );
}

async function queryItem(id: number, auctionHouseId: number, version: i.GameVersion) {
  const { db, client } = createDbClient();
  const logPrefix = `${id}:${auctionHouseId}`;

  try {
    // Check if item is in DB
    console.info(logPrefix, 'Querying item from DB');

    const queryResult = await db
      .select()
      .from(items)
      .where(and(eq(items.itemId, id), eq(items.auctionHouseId, auctionHouseId)))
      .fullJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
      .orderBy(desc(items.timestamp))
      .limit(1);
    const itemFromDb = queryResult?.[0]?.items;

    const someTimeAgo = dayjs().subtract(3, 'hours');
    const isTooOld = dayjs(itemFromDb?.timestamp) < someTimeAgo;

    // If not in DB, fetch item from TSM
    if (
      queryResult == null ||
      queryResult.length === 0 ||
      queryResult[0].items == null ||
      isTooOld
    ) {
      console.log(logPrefix, 'Item needs to be fetched from TSM');
      console.log(logPrefix, 'queryResult', queryResult);
      console.log(logPrefix, 'isTooOld', isTooOld);

      let item: Item | undefined | null;

      // Fetch entire auction house if needed
      getAuctionHouse(auctionHouseId);

      // Get the item from TSM directly
      item = await getItem(id, auctionHouseId);

      if (!item) {
        // If TSM fetch failed, return item from DB if possible
        item = itemFromDb;

        // If we still don't have the item, return not found
        if (!item) {
          return null;
        }
      }

      // Fetch item metadata and save to DB
      const itemFromBnet = await getItemFromBnet(item.itemId, version);
      const itemFromBnetSlug = slugify(itemFromBnet.name, { lowercase: true, decamelize: true });

      console.info(logPrefix, 'Saving item metadata to DB');
      await db
        .insert(itemsMetadata)
        .values({
          id: itemFromBnet.id,
          itemLevel: itemFromBnet.level,
          name: itemFromBnet.name,
          quality: qualityMap[itemFromBnet.quality.type] ?? 1,
          requiredLevel: itemFromBnet.required_level,
          slug: itemFromBnetSlug,
        })
        .onConflictDoNothing();

      return {
        server: '',
        itemId: item.itemId,
        name: itemFromBnet.name,
        sellPrice: 0,
        vendorPrice: 0,
        tooltip: [{ label: itemFromBnet.name }],
        itemLink: '',
        uniqueName: slugify(itemFromBnet.name, { lowercase: true, decamelize: true }),
        stats: {
          lastUpdated: new Date().toISOString(),
          current: {
            numAuctions: item.numAuctions,
            marketValue: item.marketValue,
            historicalValue: item.historical,
            minBuyout: item.minBuyout,
            quantity: item.quantity,
          },
          previous: null,
        },
        tags: [],
        icon: null,
        itemLevel: itemFromBnet.level,
        requiredLevel: itemFromBnet.required_level,
      } as i.NexusHub.ItemsResponse;
    }

    const { items: item, items_metadata: metadata } = queryResult[0];
    let itemFromBnet: i.GameItem | null = null;
    let itemFromBnetSlug = '';

    if (!metadata) {
      try {
        itemFromBnet = await getItemFromBnet(item.itemId, version);

        if (itemFromBnet) {
          itemFromBnetSlug = slugify(itemFromBnet.name, { lowercase: true, decamelize: true });

          console.info(logPrefix, 'Saving item to DB');
          await db
            .insert(itemsMetadata)
            .values({
              id: itemFromBnet.id,
              itemLevel: itemFromBnet.level,
              name: itemFromBnet.name,
              quality: qualityMap[itemFromBnet.quality.type] ?? 1,
              requiredLevel: itemFromBnet.required_level,
              slug: itemFromBnetSlug,
            })
            .onConflictDoNothing();
        }
      } catch (err: any) {
        console.error(logPrefix, '[getItemFromBnet]', err.message, {
          itemId: item.itemId,
          ahId: item.auctionHouseId,
        });
      }
    }

    return {
      server: '',
      itemId: item.itemId,
      name: metadata?.name ?? itemFromBnet?.name ?? '',
      sellPrice: 0,
      vendorPrice: 0,
      tooltip: [{ label: metadata?.name ?? itemFromBnet?.name ?? '' }],
      itemLink: '',
      uniqueName: itemFromBnetSlug,
      stats: {
        lastUpdated: item.timestamp ?? new Date().toISOString(),
        current: {
          numAuctions: item.numAuctions,
          marketValue: item.marketValue,
          historicalValue: item.historical,
          minBuyout: item.minBuyout,
          quantity: item.quantity,
        },
        previous: null,
      },
      tags: [],
      icon: null,
      itemLevel: metadata?.itemLevel ?? itemFromBnet?.level ?? 0,
      requiredLevel: metadata?.requiredLevel ?? itemFromBnet?.required_level ?? 0,
    } as i.NexusHub.ItemsResponse;
  } catch (err: any) {
    console.error(err);

    return { error: 'true', reason: err.message } as i.NexusHub.ErrorResponse;
  } finally {
    console.log(logPrefix, 'closing db connection');
    client.end();
  }
}
