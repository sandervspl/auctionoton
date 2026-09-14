import { getCloudflareData } from 'db/cloudflare.server';
import { createServerFn } from '@tanstack/react-start';
import { requireUser } from 'services/auth';

import { db } from 'db';

export const getDashboardSections = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await requireUser();

  const cloudflare = await getCloudflareData();
  if (cloudflare) return cloudflare.sections(userId);
  return db.query.dashboardSections.findMany({
    with: {
      items: {
        with: {
          dashboardSectionItem: {
            with: {
              item: true,
            },
          },
        },
      },
    },
    where: (dashboardSections, { eq }) => eq(dashboardSections.userId, userId),
    orderBy: (dashboardSections, { asc }) => asc(dashboardSections.order),
  });
});
