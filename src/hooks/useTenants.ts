"use client";

import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
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

export function useGetTenantById(tenantId: string | null) {
  return useQuery<Tenant | undefined, Error>({
    queryKey: tenantQueryKeys.detail(tenantId!),
    queryFn: () => tenantId ? getTenantById(tenantId) : Promise.resolve(undefined),
    enabled: !!tenantId,
  });
}

export function useAddTenant() {
  const queryClient = useQueryClient();
  return useMutation<Tenant, Error, string, { previousTenants: Tenant[] | undefined }>({
    mutationFn: (name: string) => addTenant(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueryKeys.lists() });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation<Tenant | undefined, Error, { id: string; name: string }, { previousTenants: Tenant[] | undefined }>({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateTenant(id, name),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tenantQueryKeys.detail(variables.id) });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string, { previousTenants: Tenant[] | undefined }>({
    mutationFn: (id: string) => deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueryKeys.lists() });
    },
  });
}
