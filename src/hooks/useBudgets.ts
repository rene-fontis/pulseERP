
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
  detail: (budgetId: string) => [...budgetQueryKeys.details(''), budgetId] as const, 
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
  // BudgetFormValues no longer contains 'scenario'
  return useMutation<Budget, Error, BudgetFormValues>({ 
    mutationFn: (budgetData) => addBudget(tenantId, budgetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetQueryKeys.lists(tenantId) });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  // BudgetFormValues no longer contains 'scenario'
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
    mutationFn: deleteBudget,
    onSuccess: (success, budgetId, context) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['budgets'] }); 
        queryClient.removeQueries({queryKey: budgetQueryKeys.detail(budgetId)});
      }
    },
  });
}

    