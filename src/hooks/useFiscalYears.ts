"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFiscalYears,
  getFiscalYearById,
  addFiscalYear,
  updateFiscalYear,
  deleteFiscalYear,
} from '@/services/fiscalYearService';
import type { FiscalYear, FiscalYearFormValues } from '@/types';

const fiscalYearQueryKeys = {
  all: (tenantId: string) => ['fiscalYears', tenantId] as const,
  lists: (tenantId: string) => [...fiscalYearQueryKeys.all(tenantId), 'list'] as const,
  details: (tenantId: string) => [...fiscalYearQueryKeys.all(tenantId), 'detail'] as const,
  detail: (tenantId: string, fiscalYearId: string) => [...fiscalYearQueryKeys.details(tenantId), fiscalYearId] as const,
};

export function useGetFiscalYears(tenantId: string | null) {
  return useQuery<FiscalYear[], Error>({
    queryKey: fiscalYearQueryKeys.lists(tenantId!),
    queryFn: () => (tenantId ? getFiscalYears(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  });
}

export function useGetFiscalYearById(tenantId: string | null, fiscalYearId: string | null) {
    return useQuery<FiscalYear | undefined, Error>({
        queryKey: fiscalYearQueryKeys.detail(tenantId!, fiscalYearId!),
        queryFn: () => (tenantId && fiscalYearId ? getFiscalYearById(tenantId, fiscalYearId) : Promise.resolve(undefined)),
        enabled: !!tenantId && !!fiscalYearId,
    });
}

export function useAddFiscalYear(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<FiscalYear, Error, FiscalYearFormValues>({
    mutationFn: (fiscalYearData) => addFiscalYear(tenantId, fiscalYearData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalYearQueryKeys.lists(tenantId) });
    },
  });
}

export function useUpdateFiscalYear(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<FiscalYear | undefined, Error, { fiscalYearId: string; data: Partial<FiscalYearFormValues & { isClosed: boolean }> }>({
    mutationFn: ({ fiscalYearId, data }) => updateFiscalYear(tenantId, fiscalYearId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fiscalYearQueryKeys.lists(tenantId) });
      queryClient.invalidateQueries({ queryKey: fiscalYearQueryKeys.detail(tenantId, variables.fiscalYearId) });
    },
  });
}

export function useDeleteFiscalYear(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: (fiscalYearId) => deleteFiscalYear(tenantId, fiscalYearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalYearQueryKeys.lists(tenantId) });
    },
  });
}