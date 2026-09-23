'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, TrendingUp, Package, Boxes, Receipt, Users, LineChart,
  MessageSquareText, Lightbulb, FileText, Upload, Building2, Settings, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/sales', label: 'Sales Analytics', icon: TrendingUp },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Boxes },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/forecasts', label: 'Forecasts', icon: LineChart },
  { href: '/dashboard/assistant', label: 'AI Assistant', icon: MessageSquareText },
  { href: '/dashboard/insights', label: 'Insights', icon: Lightbulb },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/upload', label: 'Data Upload', icon: Upload },
  { href: '/dashboard/business-profile', label: 'Business Profile', icon: Building2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings }
];

export function Sidebar({ businessName }: { businessName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const content = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-paper/10">
        <div className="font-display font-semibold text-paper text-lg">SME Intelligence</div>
        {businessName && <div className="text-xs text-paper/50 mt-0.5 truncate">{businessName}</div>}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? 'bg-forest-500 text-paper' : 'text-paper/70 hover:bg-paper/5 hover:text-paper'
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-paper/10">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-paper/70 hover:bg-paper/5 hover:text-paper w-full">
          <LogOut size={17} /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-forest-900 text-paper px-4 py-3">
        <span className="font-display font-semibold">SME Intelligence</span>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-forest-900 shrink-0 h-screen sticky top-0">{content}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 w-72 h-full bg-forest-900">
            <button onClick={() => setMobileOpen(false)} className="absolute right-4 top-4 text-paper/70" aria-label="Close menu">
              <X size={22} />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
