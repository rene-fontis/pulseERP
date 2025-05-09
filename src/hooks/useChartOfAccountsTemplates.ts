
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getChartOfAccountsTemplates, 
  getChartOfAccountsTemplateById,
  addChartOfAccountsTemplate, 
  updateChartOfAccountsTemplate, 
  deleteChartOfAccountsTemplate 
} from '@/services/chartOfAccountsTemplateService';
import type { ChartOfAccountsTemplate, ChartOfAccountsTemplateFormValues } from '@/types';

const templateQueryKeys = {
  all: ['chartOfAccountsTemplates'] as const,
  lists: () => [...templateQueryKeys.all, 'list'] as const,
  list: (filters?: string) => [...templateQueryKeys.lists(), { filters }] as const,
  details: () => [...templateQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateQueryKeys.details(), id] as const,
};

export function useGetChartOfAccountsTemplates() {
  return useQuery<ChartOfAccountsTemplate[], Error>({
    queryKey: templateQueryKeys.lists(),
    queryFn: getChartOfAccountsTemplates,
  });
}

export function useGetChartOfAccountsTemplateById(id: string | null) {
  return useQuery<ChartOfAccountsTemplate | undefined, Error>({
    queryKey: templateQueryKeys.detail(id as string),
    queryFn: () => id ? getChartOfAccountsTemplateById(id) : Promise.resolve(undefined),
    enabled: !!id,
  });
}

export function useAddChartOfAccountsTemplate() {
  const queryClient = useQueryClient();
  return useMutation<ChartOfAccountsTemplate, Error, ChartOfAccountsTemplateFormValues>({
    mutationFn: addChartOfAccountsTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.lists() });
    },
  });
}

export function useUpdateChartOfAccountsTemplate() {
  const queryClient = useQueryClient();
  return useMutation<ChartOfAccountsTemplate | undefined, Error, { id: string } & Partial<ChartOfAccountsTemplateFormValues>>({
    mutationFn: ({ id, ...data }) => updateChartOfAccountsTemplate(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.detail(variables.id) });
    },
  });
}

export function useDeleteChartOfAccountsTemplate() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: deleteChartOfAccountsTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.lists() });
    },
  });
}

