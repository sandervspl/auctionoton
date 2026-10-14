import { createFileRoute } from '@tanstack/react-router';
import { CreateSectionModal } from 'modules/user/dashboard/create-section-modal';
import { DashboardSection } from 'modules/user/dashboard/section';
import { getDashboardSections } from 'queries/dashboard';
import { requireUser } from '~/services/auth';

export const Route = createFileRoute('/user/dashboard')({
  beforeLoad: () => requireUser(),
  loader: () => getDashboardSections(),
  head: () => ({ meta: [{ title: 'Dashboard · Auctionoton' }] }),
  component: Dashboard,
});

function Dashboard() {
  const sections = Route.useLoaderData();
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
