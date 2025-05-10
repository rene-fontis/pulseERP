
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBudgetEntries,
  getBudgetEntryById,
  addBudgetEntry,
  updateBudgetEntry,
  deleteBudgetEntry,
} from '@/services/budgetEntryService';
import { getBudgets } from '@/services/budgetService'; // For new hook
import type { BudgetEntry, NewBudgetEntryPayload } from '@/types';

const budgetEntryQueryKeys = {
  all: (budgetId: string) => ['budgetEntries', budgetId] as const,
  lists: (budgetId: string) => [...budgetEntryQueryKeys.all(budgetId), 'list'] as const,
  details: (budgetId: string) => [...budgetEntryQueryKeys.all(budgetId), 'detail'] as const,
  detail: (entryId: string) => ['budgetEntryDetail', entryId] as const, 
};

const tenantAllBudgetEntriesQueryKeys = {
  all: (tenantId: string) => ['allTenantBudgetEntries', tenantId] as const,
};


export function useGetBudgetEntries(budgetId: string | null) {
  return useQuery<BudgetEntry[], Error>({
    queryKey: budgetEntryQueryKeys.lists(budgetId!),
    queryFn: () => (budgetId ? getBudgetEntries(budgetId) : Promise.resolve([])),
    enabled: !!budgetId,
  });
}

export function useGetBudgetEntryById(entryId: string | null) {
    return useQuery<BudgetEntry | undefined, Error>({
        queryKey: budgetEntryQueryKeys.detail(entryId!),
        queryFn: () => (entryId ? getBudgetEntryById(entryId) : Promise.resolve(undefined)),
        enabled: !!entryId,
    });
}

export function useAddBudgetEntry(budgetId: string) {
  const queryClient = useQueryClient();
  return useMutation<BudgetEntry, Error, NewBudgetEntryPayload>({
    mutationFn: (entryData) => addBudgetEntry(entryData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetEntryQueryKeys.lists(budgetId) });
      // Invalidate all tenant entries as well if a report page uses it
      if (data.budgetId) { // Assuming budgetId is on the returned data correctly
        const budget = queryClient.getQueryData<any>(['budgets', 'detail', data.budgetId]); // A bit of a hack to get tenantId
        if (budget?.tenantId) {
          queryClient.invalidateQueries({queryKey: tenantAllBudgetEntriesQueryKeys.all(budget.tenantId)});
        }
      }
    },
  });
}

export function useUpdateBudgetEntry(budgetId: string) {
  const queryClient = useQueryClient();
  return useMutation<BudgetEntry | undefined, Error, { entryId: string; data: Partial<NewBudgetEntryPayload> }>({
    mutationFn: ({ entryId, data }) => updateBudgetEntry(entryId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: budgetEntryQueryKeys.lists(budgetId) });
      queryClient.invalidateQueries({ queryKey: budgetEntryQueryKeys.detail(variables.entryId) });
       if (data?.budgetId) {
        const budget = queryClient.getQueryData<any>(['budgets', 'detail', data.budgetId]);
        if (budget?.tenantId) {
          queryClient.invalidateQueries({queryKey: tenantAllBudgetEntriesQueryKeys.all(budget.tenantId)});
        }
      }
    },
  });
}

export function useDeleteBudgetEntry(budgetId: string) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: (entryId) => deleteBudgetEntry(entryId),
    onSuccess: (success, entryId) => {
      queryClient.invalidateQueries({ queryKey: budgetEntryQueryKeys.lists(budgetId) });
      // Also invalidate all tenant entries
      const budget = queryClient.getQueryData<any>(['budgets', 'detail', budgetId]);
      if (budget?.tenantId) {
         queryClient.invalidateQueries({queryKey: tenantAllBudgetEntriesQueryKeys.all(budget.tenantId)});
      }
    },
  });
}


// New hook to fetch all budget entries for a given tenant
export function useGetAllBudgetEntriesForTenant(tenantId: string | null) {
  return useQuery<BudgetEntry[], Error>({
    queryKey: tenantAllBudgetEntriesQueryKeys.all(tenantId!),
    queryFn: async () => {
        if (!tenantId) return [];
        const budgets = await getBudgets(tenantId); // from @/services/budgetService
        let allEntries: BudgetEntry[] = [];
        for (const budget of budgets) {
            const entries = await getBudgetEntries(budget.id); // from @/services/budgetEntryService
            allEntries = allEntries.concat(entries);
        }
        return allEntries;
    },
    enabled: !!tenantId,
  });
}
