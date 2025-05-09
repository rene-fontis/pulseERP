
"use client";

import { useQuery } from '@tanstack/react-query';
import { getTenantChartOfAccountsById as fetchTenantChartOfAccountsById } from '@/services/tenantChartOfAccountsService';
import type { TenantChartOfAccounts } from '@/types';

const tenantCoaQueryKeys = {
  all: (tenantId?: string) => ['tenantChartOfAccounts', tenantId || 'all'] as const,
  detail: (coaId: string) => [...tenantCoaQueryKeys.all(), 'detail', coaId] as const,
};

export function useGetTenantChartOfAccountsById(coaId: string | null | undefined) {
  return useQuery<TenantChartOfAccounts | undefined, Error>({
    queryKey: tenantCoaQueryKeys.detail(coaId!), // `!` is okay here due to `enabled` check
    queryFn: () => (coaId ? fetchTenantChartOfAccountsById(coaId) : Promise.resolve(undefined)),
    enabled: !!coaId, // Only run query if coaId is truthy
  });
}

