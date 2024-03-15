import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';

import { CreateSectionModal } from 'modules/user/dashboard/create-section-modal';
import { db } from 'db';

type Props = {
  params: Record<string, string>;
  searchParams: Record<string, string>;
};

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function Page(props: Props) {
  const { userId } = auth();

  if (!userId) {
    toast.error('You must be logged in');
    redirect('/');
  }

  const sections = await db.query.dashboardSections.findMany({
    with: {
      items: {
        with: { dashboardSectionItem: true },
      },
    },
  });

  console.log(sections[0]?.items[0]);

  return (
    <>
      <h1>Dashboard</h1>
      <CreateSectionModal />
    </>
  );
}
