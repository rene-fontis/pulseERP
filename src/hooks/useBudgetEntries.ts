"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBudgetEntries,
  getBudgetEntryById,
  addBudgetEntry,
  updateBudgetEntry,
  deleteBudgetEntry,
} from '@/services/budgetEntryService';
import type { BudgetEntry, NewBudgetEntryPayload } from '@/types';

const budgetEntryQueryKeys = {
  all: (budgetId: string) => ['budgetEntries', budgetId] as const,
  lists: (budgetId: string) => [...budgetEntryQueryKeys.all(budgetId), 'list'] as const,
  details: (budgetId: string) => [...budgetEntryQueryKeys.all(budgetId), 'detail'] as const,
  detail: (entryId: string) => ['budgetEntryDetail', entryId] as const, // Changed to avoid conflict, budgetId not needed for specific entry
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetEntryQueryKeys.lists(budgetId) });
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
    },
  });
}

export function useDeleteBudgetEntry(budgetId: string) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: (entryId) => deleteBudgetEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetEntryQueryKeys.lists(budgetId) });
    },
  });
}
