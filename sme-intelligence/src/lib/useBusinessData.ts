'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Business, SaleRecord, ExpenseRecord, Product, InventorySnapshot } from '@/types/domain';

export interface BusinessDataset {
  business: Business | null;
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  products: Product[];
  inventory: InventorySnapshot[];
  loading: boolean;
  error: string | null;
}

/**
 * Loads the current user's active business plus all its transactional data.
 * Centralized here so every dashboard page reads data the same way, and RLS
 * on the Supabase side guarantees this only ever returns the caller's own
 * business.
 */
export function useBusinessData(): BusinessDataset {
  const router = useRouter();
  const supabase = createClient();
  const [state, setState] = useState<BusinessDataset>({
    business: null, sales: [], expenses: [], products: [], inventory: [], loading: true, error: null
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.push('/login'); return; }

      const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userData.user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (bizError || !businesses || businesses.length === 0) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: 'No business found. Please complete onboarding.' }));
        return;
      }

      const business = businesses[0] as Business;

      const [salesRes, expensesRes, productsRes, inventoryRes] = await Promise.all([
        supabase.from('sales').select('*').eq('business_id', business.id).order('transaction_date', { ascending: true }),
        supabase.from('expenses').select('*').eq('business_id', business.id).order('expense_date', { ascending: true }),
        supabase.from('products').select('*').eq('business_id', business.id),
        supabase.from('inventory').select('*').eq('business_id', business.id)
      ]);

      if (!cancelled) {
        setState({
          business,
          sales: (salesRes.data ?? []) as SaleRecord[],
          expenses: (expensesRes.data ?? []) as ExpenseRecord[],
          products: (productsRes.data ?? []) as Product[],
          inventory: (inventoryRes.data ?? []) as InventorySnapshot[],
          loading: false,
          error: null
        });
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

/** Same as useBusinessData but for the public demo business — no auth required. */
export function useDemoData(): BusinessDataset {
  const supabase = createClient();
  const [state, setState] = useState<BusinessDataset>({
    business: null, sales: [], expenses: [], products: [], inventory: [], loading: true, error: null
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: businesses } = await supabase.from('businesses').select('*').eq('is_demo', true).limit(1);
      if (!businesses || businesses.length === 0) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: 'Demo data is not seeded yet.' }));
        return;
      }
      const business = businesses[0] as Business;
      const [salesRes, expensesRes, productsRes, inventoryRes] = await Promise.all([
        supabase.from('sales').select('*').eq('business_id', business.id).order('transaction_date', { ascending: true }),
        supabase.from('expenses').select('*').eq('business_id', business.id).order('expense_date', { ascending: true }),
        supabase.from('products').select('*').eq('business_id', business.id),
        supabase.from('inventory').select('*').eq('business_id', business.id)
      ]);
      if (!cancelled) {
        setState({
          business,
          sales: (salesRes.data ?? []) as SaleRecord[],
          expenses: (expensesRes.data ?? []) as ExpenseRecord[],
          products: (productsRes.data ?? []) as Product[],
          inventory: (inventoryRes.data ?? []) as InventorySnapshot[],
          loading: false,
          error: null
        });
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

/**
 * Lightweight business-only fetch — just the business row, no sales,
 * expenses, products, or inventory. Use this anywhere you only need the
 * business name/currency/location (e.g. the sidebar, page headers) rather
 * than useBusinessData, which pulls every transactional row and would
 * otherwise re-fetch the full dataset on every dashboard page navigation
 * just to render a page title.
 */
export function useCurrentBusiness(): { business: Business | null; loading: boolean; error: string | null } {
  const router = useRouter();
  const supabase = createClient();
  const [state, setState] = useState<{ business: Business | null; loading: boolean; error: string | null }>({
    business: null, loading: true, error: null
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.push('/login'); return; }

      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userData.user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (cancelled) return;
      if (error || !businesses || businesses.length === 0) {
        setState({ business: null, loading: false, error: 'No business found.' });
        return;
      }
      setState({ business: businesses[0] as Business, loading: false, error: null });
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
