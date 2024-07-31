'use server';

import { $path } from 'next-typesafe-url';
import { revalidatePath } from 'next/cache';
import { zfd } from 'zod-form-data';
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerAction } from 'zsa';

import { db } from 'db';
import { dashboardSectionItems, dashboardSections, dashboardSectionsSectionItems } from 'db/schema';
import { and, eq } from 'drizzle-orm';

const createDashboardSectionSchema = zfd.formData({
  section_name: zfd.text(z.string({ required_error: 'Name is required' }).min(1).max(100)),
});

export async function createDashboardSection(state: any, formdata: FormData) {
  try {
    const { userId } = auth();
    if (!userId) {
      redirect('/');
    }

    const data = createDashboardSectionSchema.parse(formdata);

    await db
      .insert(dashboardSections)
      .values({ name: data.section_name, userId, order: 0 })
      .returning({ id: dashboardSections.id });

    revalidatePath($path({ route: '/user/dashboard' }));
  } catch (error: any) {
    console.error('Error creating dashboard section', error.message);

    return {
      error: 'Error creating dashboard section',
    };
  }

  return {
    error: '',
  };
}

const addSectionItem = zfd.formData({
  section_id: zfd.numeric(z.number({ required_error: 'Section ID is required' })),
  item_id: zfd.numeric(z.number({ required_error: 'Item ID is required' })),
  highest_order: zfd.numeric(z.number({ required_error: 'Highest Order is required' })),
});

export async function addDashboardSectionItem(state: any, formdata: FormData) {
  try {
    const { userId } = auth();
    if (!userId) {
      redirect('/');
    }

    const data = addSectionItem.parse(formdata);

    await db.transaction(async (tx) => {
      const [sectionItem] = await tx
        .insert(dashboardSectionItems)
        .values({
          itemId: data.item_id,
          order: data.highest_order + 1,
        })
        .returning({ id: dashboardSectionItems.id });

      if (!sectionItem) {
        throw new Error('Error adding dashboard section item');
      }

      await tx.insert(dashboardSectionsSectionItems).values({
        dashboardSectionId: data.section_id,
        dashboardSectionItemId: sectionItem.id,
      });
    });

    revalidatePath($path({ route: '/user/dashboard' }));
  } catch (error: any) {
    console.error('Error adding dashboard section item', error.message);

    return {
      error: 'Error adding dashboard section item',
    };
  }

  return {
    error: '',
  };
}

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
