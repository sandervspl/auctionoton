import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

import { CreateSectionModal } from 'modules/user/dashboard/create-section-modal';
import { getDashboardSections } from 'queries/dashboard';
import { DashboardSection } from 'modules/user/dashboard/section';

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
    redirect('/?error=unauthorized');
  }

  const sections = await getDashboardSections();

  return (
    <div className="space-y-4 p-10">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="flex items-center gap-4">
        <CreateSectionModal />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <DashboardSection key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
