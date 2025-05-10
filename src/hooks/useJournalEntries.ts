"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as journalEntryService from '@/services/journalEntryService';
import type { JournalEntry, NewJournalEntryPayload } from '@/types';

const journalEntryQueryKeys = {
  all: (tenantId?: string) => ['journalEntries', tenantId || 'allScope'] as const,
  list: (tenantId: string, fiscalYearId?: string | null) => [...journalEntryQueryKeys.all(tenantId), 'list', fiscalYearId ?? 'allFiscalYears'] as const,
  detail: (tenantId: string, entryId: string) => [...journalEntryQueryKeys.all(tenantId), 'detail', entryId] as const,
};

const tenantAllJournalEntriesQueryKeys = { // For fetching all entries for a tenant
  all: (tenantId: string) => ['allTenantJournalEntries', tenantId] as const,
};


export function useGetJournalEntries(tenantId: string | null, fiscalYearId?: string | null) {
  return useQuery<JournalEntry[], Error>({
    queryKey: journalEntryQueryKeys.list(tenantId!, fiscalYearId),
    queryFn: () => (tenantId ? journalEntryService.getJournalEntries(tenantId, fiscalYearId === null ? undefined : fiscalYearId) : Promise.resolve([])),
    enabled: !!tenantId, // Entries are always tenant-specific
  });
}

export function useAddJournalEntry(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<JournalEntry, Error, NewJournalEntryPayload>({
    mutationFn: (entryData) => {
      if (typeof journalEntryService.addJournalEntry !== 'function') {
        console.error('journalEntryService.addJournalEntry is not a function');
        throw new Error('Service function addJournalEntry is not available.');
      }
      return journalEntryService.addJournalEntry(entryData);
    },
    onSuccess: (data) => {
      // Invalidate list for the specific tenant and fiscal year of the new entry
      queryClient.invalidateQueries({ queryKey: journalEntryQueryKeys.list(tenantId, data.fiscalYearId) });
      // Also invalidate the "all fiscal years" list if it was used
      queryClient.invalidateQueries({ queryKey: journalEntryQueryKeys.list(tenantId, null) });
      queryClient.invalidateQueries({ queryKey: tenantAllJournalEntriesQueryKeys.all(tenantId) }); // Invalidate all tenant entries too
    },
  });
}

export function useUpdateJournalEntry(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<JournalEntry | undefined, Error, { entryId: string; data: Partial<NewJournalEntryPayload> }>({
    mutationFn: ({ entryId, data }) => journalEntryService.updateJournalEntry(entryId, data),
    onSuccess: (data, variables) => {
      // Invalidate list for the specific tenant and potentially the fiscal year of the updated entry
      queryClient.invalidateQueries({ queryKey: journalEntryQueryKeys.list(tenantId, data?.fiscalYearId) });
      queryClient.invalidateQueries({ queryKey: journalEntryQueryKeys.list(tenantId, null) });
      queryClient.invalidateQueries({ queryKey: journalEntryQueryKeys.detail(tenantId, variables.entryId) });
      queryClient.invalidateQueries({ queryKey: tenantAllJournalEntriesQueryKeys.all(tenantId) }); // Invalidate all tenant entries too
    },
  });
}

export function useDeleteJournalEntry(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string, { previousEntry?: JournalEntry } >({
    // If optimistic updates were used, context would contain previousEntry for rollback
    mutationFn: (entryId) => journalEntryService.deleteJournalEntry(entryId),
    onSuccess: (success, entryId, context) => {
      if (success) {
        // To properly invalidate, we'd need to know which fiscal year list to update.
        // This might require fetching the entry before deleting or passing fiscalYearId.
        // For now, invalidate all lists for the tenant, or refine if fiscalYearId is available.
        // Invalidate both specific fiscal year lists and the "all fiscal years" list.
        queryClient.invalidateQueries({ queryKey: journalEntryQueryKeys.all(tenantId) }); 
        queryClient.invalidateQueries({ queryKey: tenantAllJournalEntriesQueryKeys.all(tenantId) }); // Invalidate all tenant entries too
      }
    },
  });
}


// New hook to fetch all journal entries for a given tenant, regardless of fiscal year.
export function useGetAllJournalEntriesForTenant(tenantId: string | null) {
  return useQuery<JournalEntry[], Error>({
    queryKey: tenantAllJournalEntriesQueryKeys.all(tenantId!),
    queryFn: async () => {
        if (!tenantId) return [];
        // Assuming journalEntryService.getJournalEntries(tenantId, undefined) fetches ALL entries for the tenant.
        // If it doesn't, this service function or its usage here would need adjustment.
        return journalEntryService.getJournalEntries(tenantId, undefined); 
    },
    enabled: !!tenantId,
  });
}
