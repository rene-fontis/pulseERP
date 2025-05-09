"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getTenantChartOfAccountsById as fetchTenantChartOfAccountsById,
    updateTenantChartOfAccounts as updateTenantChartOfAccountsService 
} from '@/services/tenantChartOfAccountsService';
import type { TenantChartOfAccounts, TenantChartOfAccountsFormValues } from '@/types';

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

export function useUpdateTenantChartOfAccounts() {
  const queryClient = useQueryClient();
  return useMutation<TenantChartOfAccounts | undefined, Error, { coaId: string; data: TenantChartOfAccountsFormValues }>({
    mutationFn: ({ coaId, data }) => updateTenantChartOfAccountsService(coaId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantCoaQueryKeys.detail(variables.coaId) });
      if (data?.tenantId) { // Invalidate broader list if tenantId is available from response
        queryClient.invalidateQueries({ queryKey: tenantCoaQueryKeys.all(data.tenantId) });
      } else {
        queryClient.invalidateQueries({ queryKey: tenantCoaQueryKeys.all() }); // Fallback to invalidate all if tenantId not directly available
      }
    },
  });
}