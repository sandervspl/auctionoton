'use server';

import { $path } from 'next-typesafe-url';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerAction } from 'zsa';
import { and, eq } from 'drizzle-orm';

import { db } from 'db';
import { dashboardSectionItems, dashboardSections, dashboardSectionsSectionItems } from 'db/schema';

export const createDashboardSection = createServerAction()
  .input(
    z.object({
      section_name: z.string().min(1).max(100),
    }),
  )
  .handler(async ({ input }) => {
    const { userId } = auth();
    if (!userId) {
      redirect('/');
    }

    await db
      .insert(dashboardSections)
      .values({ name: input.section_name, userId, order: 0 })
      .returning({ id: dashboardSections.id });

    revalidatePath('/user/dashboard');
  });

export const addDashboardSectionItem = createServerAction()
  .input(
    z.object({
      section_id: z.number(),
      item_id: z.number(),
      highest_order: z.number(),
    }),
  )
  .handler(async ({ input }) => {
    const { userId } = auth();
    if (!userId) {
      redirect('/');
    }

    await db.transaction(async (tx) => {
      const [sectionItem] = await tx
        .insert(dashboardSectionItems)
        .values({
          itemId: input.item_id,
          order: input.highest_order + 1,
        })
        .returning({ id: dashboardSectionItems.id });

      if (!sectionItem) {
        throw new Error('Error adding dashboard section item');
      }

      await tx.insert(dashboardSectionsSectionItems).values({
        dashboardSectionId: input.section_id,
        dashboardSectionItemId: sectionItem.id,
      });
    });

    revalidatePath($path({ route: '/user/dashboard' }));
  });

export const deleteDashboardSection = createServerAction()
  .input(
    z.object({
      sectionId: z.number(),
    }),
  )
  .handler(async ({ input }) => {
    await db.delete(dashboardSections).where(eq(dashboardSections.id, input.sectionId));
    revalidatePath('/user/dashboard');
  });

export const deleteDashboardSectionItem = createServerAction()
  .input(
    z.object({
      sectionId: z.number(),
      sectionItemId: z.number(),
    }),
  )
  .handler(async ({ input }) => {
    await db.transaction(async (tx) => {
      await tx
        .delete(dashboardSectionsSectionItems)
        .where(
          and(
            eq(dashboardSectionsSectionItems.dashboardSectionId, input.sectionId),
            eq(dashboardSectionsSectionItems.dashboardSectionItemId, input.sectionItemId),
          ),
        );
      await tx
        .delete(dashboardSectionItems)
        .where(eq(dashboardSectionItems.id, input.sectionItemId));
    });
    revalidatePath('/user/dashboard');
  });
