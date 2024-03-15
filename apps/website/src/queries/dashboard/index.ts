import { db } from 'db';

export async function getDashboardSections() {
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
    orderBy: (dashboardSections, { asc }) => asc(dashboardSections.order),
  });
}
