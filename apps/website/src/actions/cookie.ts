'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { createServerAction } from 'zsa';

import { getAuctionHouseId } from 'queries/auction-house';

export const setAuctionHouseIdCookie = createServerAction()
  .input(
    z.object({
      region: z.string(),
      realmSlug: z.string(),
      faction: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    const auctionHouseId = getAuctionHouseId(input.region, input.realmSlug, input.faction);
    cookies().set('auctionhouse_id', auctionHouseId);
  });
