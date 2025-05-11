
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSegments,
  addSegment,
  updateSegment,
  deleteSegment,
} from "@/services/segmentService";
import type { Segment, NewSegmentPayload } from "@/types";

const segmentQueryKeys = {
  all: (tenantId: string) => ["segments", tenantId] as const,
  lists: (tenantId: string) => [...segmentQueryKeys.all(tenantId), "list"] as const,
  details: (tenantId: string) => [...segmentQueryKeys.all(tenantId), "detail"] as const,
  detail: (segmentId: string) => [...segmentQueryKeys.details(""), segmentId] as const,
};

export function useGetSegments(tenantId: string | null) {
  return useQuery<Segment[], Error>({
    queryKey: segmentQueryKeys.lists(tenantId!),
    queryFn: () => (tenantId ? getSegments(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentQueryKeys.lists(tenantId) });
    },
  });
}