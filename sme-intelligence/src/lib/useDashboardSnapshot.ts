'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Business } from '@/types/domain';
import type { DashboardMetricsBundle, RangeKey } from '@/lib/analytics/snapshotEngine';

interface DashboardSnapshotState {
  business: Business | null;
  bundle: DashboardMetricsBundle | null;
  loading: boolean;
  error: string | null;
  cacheHit: boolean;
  noData: boolean;
}

/**
 * Fetches dashboard metrics from the server-cached /api/analytics/dashboard
 * endpoint instead of pulling every raw sales/expense row into the browser.
 * Refetches whenever `range` changes; the server decides cache hit vs. miss.
 */
export function useDashboardSnapshot(range: RangeKey): DashboardSnapshotState {
  const router = useRouter();
  const [state, setState] = useState<DashboardSnapshotState>({
    business: null, bundle: null, loading: true, error: null, cacheHit: false, noData: false
  });

  const fetchBundle = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`/api/analytics/dashboard?range=${range}`, { credentials: 'same-origin' });
      if (res.status === 401) { router.push('/login'); return; }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState((s) => ({ ...s, loading: false, error: body.error ?? 'Failed to load dashboard.' }));
        return;
      }
      const data = await res.json();
      if (data.reason === 'no_sales_data') {
        setState({ business: data.business, bundle: null, loading: false, error: null, cacheHit: false, noData: true });
        return;
      }
      setState({ business: data.business, bundle: data.bundle, loading: false, error: null, cacheHit: data.cacheHit, noData: false });
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message ?? 'Network error loading dashboard.' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => { fetchBundle(); }, [fetchBundle]);

  return state;
}
