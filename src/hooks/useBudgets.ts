
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBudgets,
  getBudgetById,
  addBudget,
  updateBudget,
  deleteBudget,
} from '@/services/budgetService';
import type { Budget, BudgetFormValues } from '@/types';

const budgetQueryKeys = {
  all: (tenantId: string) => ['budgets', tenantId] as const,
  lists: (tenantId: string) => [...budgetQueryKeys.all(tenantId), 'list'] as const,
  details: (tenantId: string) => [...budgetQueryKeys.all(tenantId), 'detail'] as const,
  detail: (budgetId: string) => [...budgetQueryKeys.details(''), budgetId] as const, // TenantId not part of detail key for simplicity if budgetId is global
};

export function useGetBudgets(tenantId: string | null) {
  return useQuery<Budget[], Error>({
    queryKey: budgetQueryKeys.lists(tenantId!),
    queryFn: () => (tenantId ? getBudgets(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  });
}

export function useGetBudgetById(budgetId: string | null) {
  return useQuery<Budget | undefined, Error>({
    queryKey: budgetQueryKeys.detail(budgetId!),
    queryFn: () => (budgetId ? getBudgetById(budgetId) : Promise.resolve(undefined)),
    enabled: !!budgetId,
  });
}

export function useAddBudget(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<Budget, Error, BudgetFormValues>({
    mutationFn: (budgetData) => addBudget(tenantId, budgetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetQueryKeys.lists(tenantId) });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation<Budget | undefined, Error, { budgetId: string; data: Partial<BudgetFormValues> }>({
    mutationFn: ({ budgetId, data }) => updateBudget(budgetId, data),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.lists(data.tenantId) });
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.detail(variables.budgetId) });
      }
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string, { previousBudgets?: Budget[] }>({
    mutationFn: deleteBudget, // Pass the function reference directly
    onSuccess: (success, budgetId, context) => {
      if (success) {
        // A bit aggressive, but ensures lists are updated.
        // If tenantId was available from the deleted budget (e.g. from context or by fetching before delete),
        // we could be more specific.
        queryClient.invalidateQueries({ queryKey: ['budgets'] }); // Consider a more specific invalidation if tenantId is known
        queryClient.removeQueries({queryKey: budgetQueryKeys.detail(budgetId)});
      }
    },
  });
}
