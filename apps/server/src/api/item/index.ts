import { and, eq, desc } from 'drizzle-orm';
import slugify from '@sindresorhus/slugify';
import dayjs from 'dayjs';

import * as i from '../../types';
import { createDbClient } from '../../db';
import { items, itemsMetadata } from '../../db/schema';
import { getItemFromBnet } from '../../utils/blizzard/index.ts';
import { qualityMap } from '../../utils';
import { updateAuctionHouseData } from './auction-house';
import { getAuctionHouse } from '../../utils/tsm';

export async function itemService(itemId: number, auctionHouseId: number) {
  const item = await queryItem(itemId, auctionHouseId);

  return (
    item ?? {
      error: true,
      reason: 'Item not found',
    }
  );
}

async function queryItem(id: number, auctionHouseId: number) {
  const { db, client } = createDbClient();

  try {
    // Check if item is in DB
    console.info('1. Querying item from DB');

    const queryResult = await db
      .select()
      .from(items)
      .where(and(eq(items.itemId, id), eq(items.auctionHouseId, auctionHouseId)))
      .fullJoin(itemsMetadata, eq(items.itemId, itemsMetadata.id))
      .orderBy(desc(items.timestamp))
      .limit(1);
    console.info('1. done');

    const someDaysAgo = dayjs().subtract(3, 'days');
    const isTooOld = dayjs(queryResult?.[0]?.items?.timestamp) < someDaysAgo;

    // If not in DB, fetch item from TSM
    if (
      queryResult == null ||
      queryResult.length === 0 ||
      queryResult[0].items == null ||
      isTooOld
    ) {
      console.log('1. Item needs to be fetched from TSM');
      console.log('queryResult', queryResult);
      console.log('isTooOld', isTooOld);

      const ahItems = await getAuctionHouse(auctionHouseId);
      if (!ahItems) {
        return null;
      }

      const item = ahItems.find((ahItem) => ahItem.itemId === id);
      if (!item) {
        return null;
      }

      // Fetch item metadata and save to DB
      const itemFromBnet = await getItemFromBnet(item.itemId);
      const itemFromBnetSlug = slugify(itemFromBnet.name, { lowercase: true, decamelize: true });

      console.info('4. Saving item metadata to DB');
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
      console.info('4. done');

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
        itemFromBnet = await getItemFromBnet(item.itemId);

        if (itemFromBnet) {
          itemFromBnetSlug = slugify(itemFromBnet.name, { lowercase: true, decamelize: true });

          console.info('4. Saving item to DB');
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
          console.info('4. done');
        }
      } catch (err: any) {
        console.error('[getItemFromBnet]', err.message, {
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
    console.log('closing db connection');
    client.end();
  }
}
