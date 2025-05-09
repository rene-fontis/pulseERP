"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTenants, addTenant, updateTenant, deleteTenant, getTenantById } from '@/services/tenantService';
import type { Tenant } from '@/types';

const tenantQueryKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantQueryKeys.all, 'list'] as const,
  list: (filters?: string) => [...tenantQueryKeys.lists(), { filters }] as const,
  details: () => [...tenantQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantQueryKeys.details(), id] as const,
};


export function useGetTenants() {
  return useQuery<Tenant[], Error>({
    queryKey: tenantQueryKeys.lists(),
    queryFn: getTenants,
  });
}

export function useGetTenantById(tenantId: string | null | undefined) { // Allow undefined for safer usage
  return useQuery<Tenant | undefined, Error>({
    queryKey: tenantQueryKeys.detail(tenantId!), // `!` is okay here due to `enabled` check
    queryFn: () => tenantId ? getTenantById(tenantId) : Promise.resolve(undefined),
    enabled: !!tenantId, // Only run query if tenantId is truthy
  });
}

export function useAddTenant() {
  const queryClient = useQueryClient();
  return useMutation<Tenant, Error, { name: string, chartOfAccountsTemplateId?: string }>({
    mutationFn: ({ name, chartOfAccountsTemplateId }) => addTenant(name, chartOfAccountsTemplateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueryKeys.lists() });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation<Tenant | undefined, Error, { id: string; data: Partial<Pick<Tenant, 'name' | 'activeFiscalYearId'>> }>({
    mutationFn: ({ id, data }) => updateTenant(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantQueryKeys.lists() });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.detail(variables.id) });
      }
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: (id: string) => deleteTenant(id),
    onSuccess: (data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: tenantQueryKeys.lists() });
      if (deletedId) {
         queryClient.removeQueries({ queryKey: tenantQueryKeys.detail(deletedId), exact: true });
      }
    },
  });
}