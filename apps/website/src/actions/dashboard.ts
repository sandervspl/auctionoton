import { getCloudflareData } from 'db/cloudflare.server';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { and, eq, inArray, notExists } from 'drizzle-orm';
import { db } from 'db';
import { dashboardSectionItems, dashboardSections, dashboardSectionsSectionItems } from 'db/schema';
import { requireUser } from 'services/auth';

export const createDashboardSection = createServerFn({ method: 'POST' })
  .validator(z.object({ section_name: z.string().trim().min(1).max(100) }))
  .handler(async ({ data }) => {
    const { userId } = await requireUser();
    const cloudflare = await getCloudflareData();
    if (cloudflare) return cloudflare.createSection(userId, data.section_name);
    await db.insert(dashboardSections).values({ name: data.section_name, userId, order: 0 });
  });

export const addDashboardSectionItem = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      section_id: z.number().int().positive(),
      item_id: z.number().int().positive(),
      highest_order: z.number().int().nonnegative(),
    }),
  )
  .handler(async ({ data }) => {
    const { userId } = await requireUser();
    const cloudflare = await getCloudflareData();
    if (cloudflare) return cloudflare.addSectionItem(userId, data.section_id, data.item_id);
    await db.transaction(async (tx) => {
      const section = await tx.query.dashboardSections.findFirst({
        where: and(eq(dashboardSections.id, data.section_id), eq(dashboardSections.userId, userId)),
      });
      if (!section) throw new Error('Collection not found');
      const [sectionItem] = await tx
        .insert(dashboardSectionItems)
        .values({ itemId: data.item_id, order: data.highest_order + 1 })
        .returning({ id: dashboardSectionItems.id });
      if (!sectionItem) throw new Error('Error adding dashboard section item');
      await tx.insert(dashboardSectionsSectionItems).values({
        dashboardSectionId: data.section_id,
        dashboardSectionItemId: sectionItem.id,
      });
    });
  });

export const deleteDashboardSection = createServerFn({ method: 'POST' })
  .validator(z.object({ sectionId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { userId } = await requireUser();
    const cloudflare = await getCloudflareData();
    if (cloudflare) return cloudflare.deleteSection(userId, data.sectionId);
    await db.transaction(async (tx) => {
      const section = await tx.query.dashboardSections.findFirst({
        where: and(eq(dashboardSections.id, data.sectionId), eq(dashboardSections.userId, userId)),
      });
      if (!section) throw new Error('Collection not found');
      const removed = await tx
        .delete(dashboardSectionsSectionItems)
        .where(eq(dashboardSectionsSectionItems.dashboardSectionId, data.sectionId))
        .returning({ itemId: dashboardSectionsSectionItems.dashboardSectionItemId });
      await tx.delete(dashboardSections).where(eq(dashboardSections.id, data.sectionId));
      if (removed.length > 0) {
        await tx.delete(dashboardSectionItems).where(
          and(
            inArray(
              dashboardSectionItems.id,
              removed.map(({ itemId }) => itemId),
            ),
            notExists(
              tx
                .select()
                .from(dashboardSectionsSectionItems)
                .where(
                  eq(
                    dashboardSectionsSectionItems.dashboardSectionItemId,
                    dashboardSectionItems.id,
                  ),
                ),
            ),
          ),
        );
      }
    });
  });

export const deleteDashboardSectionItem = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      sectionId: z.number().int().positive(),
      sectionItemId: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    const { userId } = await requireUser();
    const cloudflare = await getCloudflareData();
    if (cloudflare) return cloudflare.deleteSectionItem(userId, data.sectionId, data.sectionItemId);
    await db.transaction(async (tx) => {
      const section = await tx.query.dashboardSections.findFirst({
        where: and(eq(dashboardSections.id, data.sectionId), eq(dashboardSections.userId, userId)),
      });
      if (!section) throw new Error('Collection not found');
      const removed = await tx
        .delete(dashboardSectionsSectionItems)
        .where(
          and(
            eq(dashboardSectionsSectionItems.dashboardSectionId, data.sectionId),
            eq(dashboardSectionsSectionItems.dashboardSectionItemId, data.sectionItemId),
          ),
        )
        .returning();
      if (removed.length === 0) throw new Error('Collection item not found');
      await tx
        .delete(dashboardSectionItems)
        .where(eq(dashboardSectionItems.id, data.sectionItemId));
    });
  });
