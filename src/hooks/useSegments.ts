
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSegments,
  getSegmentById, // Import the new service function
  addSegment,
  updateSegment,
  deleteSegment,
} from "@/services/segmentService";
import type { Segment, NewSegmentPayload } from "@/types";

const segmentQueryKeys = {
  // Keys for lists of segments scoped to a tenant
  forTenant: (tenantId: string) => ["segments", "byTenant", tenantId] as const,
  lists: (tenantId: string) => [...segmentQueryKeys.forTenant(tenantId), "list"] as const,
  
  // Keys for individual segment details (globally unique by ID)
  detailsRoot: () => ["segments", "details"] as const, // General prefix for segment details
  detail: (segmentId: string) => [...segmentQueryKeys.detailsRoot(), segmentId] as const,
};


export function useGetSegments(tenantId: string | null) {
  return useQuery<Segment[], Error>({
    queryKey: segmentQueryKeys.lists(tenantId!),
    queryFn: () => (tenantId ? getSegments(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  });
}

export function useGetSegmentById(segmentId: string | null) {
  return useQuery<Segment | undefined, Error>({
    queryKey: segmentQueryKeys.detail(segmentId!),
    queryFn: () => (segmentId ? getSegmentById(segmentId) : Promise.resolve(undefined)),
    enabled: !!segmentId,
  });
}

export function useAddSegment(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<Segment, Error, NewSegmentPayload>({
    mutationFn: (segmentData) => addSegment(tenantId, segmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentQueryKeys.lists(tenantId) });
    },
  });
}

export function useUpdateSegment(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    Segment | undefined,
    Error,
    { segmentId: string; data: Partial<NewSegmentPayload> }
  >({
    mutationFn: ({ segmentId, data }) => updateSegment(segmentId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: segmentQueryKeys.lists(tenantId) });
      queryClient.invalidateQueries({ queryKey: segmentQueryKeys.detail(variables.segmentId) });
    },
  });
}

export function useDeleteSegment(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: deleteSegment,
    onSuccess: (success, deletedSegmentId) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: segmentQueryKeys.lists(tenantId) });
        queryClient.removeQueries({queryKey: segmentQueryKeys.detail(deletedSegmentId)});
      }
    },
  });
}
