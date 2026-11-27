import { createServerFn } from '@tanstack/react-start';
import { notFound } from '@tanstack/react-router';
import { z } from 'zod';
import { getAuctionHouseId } from 'services/auction-house';
import { historyRangeSchema } from 'services/history-range';
import { getItemHistory, getItemWithId } from './items.server';

export const getItemDetail = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      realmSlug: z.string(),
      region: z.string(),
      faction: z.string(),
      itemSlug: z.string(),
      range: historyRangeSchema,
    }),
  )
  .handler(async ({ data }) => {
    const itemId = Number(data.itemSlug.split('-').pop());
    const auctionHouseId = getAuctionHouseId(data.region, data.realmSlug, data.faction);
    if (!Number.isSafeInteger(itemId) || itemId <= 0 || auctionHouseId == null) {
      throw notFound();
    }
    const [itemMetadata, { points, archiveUnavailable }] = await Promise.all([
      getItemWithId(itemId),
      getItemHistory(itemId, auctionHouseId, data.region, data.range),
    ]);
    if (!itemMetadata) throw notFound();
    return { itemMetadata, itemHistory: points, archiveUnavailable };
  });
