
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getJournalEntries,
  addJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} from '@/services/journalEntryService';
import type { JournalEntry, NewJournalEntryPayload } from '@/types';

const journalEntryQueryKeys = {
  all: (tenantId?: string) => ['journalEntries', tenantId || 'allScope'] as const,
  list: (tenantId: string) => [...journalEntryQueryKeys.all(tenantId), 'list'] as const,
  detail: (tenantId: string, entryId: string) => [...journalEntryQueryKeys.all(tenantId), 'detail', entryId] as const,
};

export function useGetJournalEntries(tenantId: string | null) {
  return useQuery<JournalEntry[], Error>({
    queryKey: journalEntryQueryKeys.list(tenantId!),
    queryFn: () => (tenantId ? getJournalEntries(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  });
}

export function useAddJournalEntry(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<JournalEntry, Error, NewJournalEntryPayload>({
    mutationFn: (entryData) => addJournalEntry(entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalEntryQueryKeys.list(tenantId) });
    },
  });
}

export function useUpdateJournalEntry(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<JournalEntry | undefined, Error, { entryId: string; data: Partial<NewJournalEntryPayload> }>({
    mutationFn: ({ entryId, data }) => updateJournalEntry(entryId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: journalEntryQueryKeys.list(tenantId) });
      queryClient.invalidateQueries({ queryKey: journalEntryQueryKeys.detail(tenantId, variables.entryId) });
    },
  });
}

export function useDeleteJournalEntry(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: (entryId) => deleteJournalEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalEntryQueryKeys.list(tenantId) });
    },
  });
}
