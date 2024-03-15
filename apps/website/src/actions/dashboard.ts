'use server';

import { $path } from 'next-typesafe-url';
import { revalidatePath } from 'next/cache';
import { zfd } from 'zod-form-data';
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';

import { db } from 'db';
import { dashboardSections } from 'db/schema';

const createDashboardSectionSchema = zfd.formData({
  name: zfd.text(z.string().min(1).max(100)),
});

export async function createDashboardSection(state: any, formdata: FormData) {
  try {
    const data = createDashboardSectionSchema.parse(formdata);

    const { userId } = auth();

    if (!userId) {
      toast.error('You must be logged in');
      redirect('/');
    }

    await db
      .insert(dashboardSections)
      .values({ name: data.name, userId, order: 0 })
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
