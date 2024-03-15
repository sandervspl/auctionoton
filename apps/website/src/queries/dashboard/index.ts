import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

import { db } from 'db';

export async function getDashboardSections() {
  const { userId } = auth();
  if (!userId) {
    redirect('/?error=unauthorized');
  }

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
}
