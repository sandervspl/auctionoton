import { createServerFn } from '@tanstack/react-start';
import { setCookie } from '@tanstack/react-start/server';
import { z } from 'zod';
import { getAuctionHouseId } from 'services/auction-house';

export const setAuctionHouseIdCookie = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      region: z.enum(['eu', 'us']),
      realmSlug: z.string(),
      faction: z.enum(['alliance', 'horde']),
    }),
  )
  .handler(async ({ data }) => {
    const auctionHouseId = getAuctionHouseId(data.region, data.realmSlug, data.faction);
    if (auctionHouseId == null) throw new Error('Unknown auction house');
    setCookie('auctionhouse_id', String(auctionHouseId), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  });
