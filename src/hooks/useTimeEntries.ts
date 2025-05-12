"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTimeEntries,
  getTimeEntryById,
  addTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from "@/services/timeEntryService";
import type { TimeEntry, NewTimeEntryPayload } from "@/types";
// Assuming you might have an auth hook to get current user ID
// import { useAuth } from './useAuth'; 

const timeEntryQueryKeys = {
  all: (tenantId: string) => ["timeEntries", tenantId] as const,
  lists: (tenantId: string, filters?: any) => [...timeEntryQueryKeys.all(tenantId), "list", filters || {}] as const,
  details: (tenantId: string) => [...timeEntryQueryKeys.all(tenantId), "detail"] as const,
  detail: (entryId: string) => [...timeEntryQueryKeys.details(""), entryId] as const,
};

export function useGetTimeEntries(
  tenantId: string | null,
  filters?: { contactId?: string; projectId?: string; taskId?: string; userId?: string; startDate?: string; endDate?: string }
) {
  return useQuery<TimeEntry[], Error>({
    queryKey: timeEntryQueryKeys.lists(tenantId!, filters),
    queryFn: () => (tenantId ? getTimeEntries(tenantId, filters) : Promise.resolve([])),
    enabled: !!tenantId,
  });
}

export function useGetTimeEntryById(entryId: string | null) {
    return useQuery<TimeEntry | undefined, Error>({
        queryKey: timeEntryQueryKeys.detail(entryId!),
        queryFn: () => (entryId ? getTimeEntryById(entryId) : Promise.resolve(undefined)),
        enabled: !!entryId,
    });
}

export function useAddTimeEntry(tenantId: string) {
  const queryClient = useQueryClient();
  // const { currentUser } = useAuth(); // Example: Get current user for userId

  return useMutation<TimeEntry, Error, NewTimeEntryPayload>({
    mutationFn: (entryData) => {
      // In a real app, get userId from auth state
      const mockUserId = "mock-user-id"; // Replace with actual user ID
      return addTimeEntry(entryData, mockUserId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: timeEntryQueryKeys.lists(tenantId) });
    },
  });
}

export function useUpdateTimeEntry(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    TimeEntry | undefined,
    Error,
    { entryId: string; data: Partial<NewTimeEntryPayload> }
  >({
    mutationFn: ({ entryId, data }) => updateTimeEntry(entryId, data),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: timeEntryQueryKeys.lists(tenantId) });
        queryClient.invalidateQueries({ queryKey: timeEntryQueryKeys.detail(variables.entryId) });
      }
    },
  });
}

export function useDeleteTimeEntry(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: deleteTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryQueryKeys.lists(tenantId) });
    },
  });
}