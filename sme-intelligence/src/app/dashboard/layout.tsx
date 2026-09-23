'use client';

import { Sidebar } from '@/components/Sidebar';
import { useCurrentBusiness } from '@/lib/useBusinessData';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Lightweight — fetches only the business row, not the full transactional
  // dataset, so navigating between dashboard pages doesn't re-pull every
  // sales/expense row just to render the sidebar's business name.
  const { business } = useCurrentBusiness();

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar businessName={business?.business_name} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
