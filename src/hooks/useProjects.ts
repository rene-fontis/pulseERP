
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjects,
  getProjectById,
  addProject,
  updateProject,
  deleteProject,
} from "@/services/projectService";
import type { Project, NewProjectPayload, ProjectStatus } from "@/types";

const projectQueryKeys = {
  all: (tenantId: string) => ["projects", tenantId] as const,
  lists: (tenantId: string, statusFilter?: ProjectStatus[]) => 
    [...projectQueryKeys.all(tenantId), "list", statusFilter ? statusFilter.join('_') : "ALL_STATUSES"] as const,
  details: (tenantId: string) => [...projectQueryKeys.all(tenantId), "detail"] as const,
  detail: (projectId: string) => [...projectQueryKeys.details(""), projectId] as const, // Using empty string for tenantId if not needed for specific detail
};

export function useGetProjects(tenantId: string | null, statusFilter?: ProjectStatus[]) {
  return useQuery<Project[], Error>({
    // Use a distinct key part like "ALL_STATUSES" when statusFilter is undefined to ensure it's cached separately.
    queryKey: projectQueryKeys.lists(tenantId!, statusFilter), 
    queryFn: () => (tenantId ? getProjects(tenantId, statusFilter) : Promise.resolve([])),
    enabled: !!tenantId,
  });
}

export function useGetProjectById(projectId: string | null) {
  return useQuery<Project | undefined, Error>({
    queryKey: projectQueryKeys.detail(projectId!),
    queryFn: () => (projectId ? getProjectById(projectId) : Promise.resolve(undefined)),
    enabled: !!projectId,
  });
}

export function useAddProject(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, NewProjectPayload>({
    mutationFn: (projectData) => addProject(tenantId, projectData),
    onSuccess: (data) => {
      // Invalidate all relevant lists when a new project is added.
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all(tenantId) }); 
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation<
    Project | undefined,
    Error,
    { projectId: string; data: Partial<Project> }
  >({
    mutationFn: ({ projectId, data }) => updateProject(projectId, data),
    onSuccess: (data, variables) => {
      if (data) {
        // Invalidate all relevant lists when a project is updated.
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.all(data.tenantId) });
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(variables.projectId) });
      }
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string, { previousProjects?: Project[] }>({
    mutationFn: deleteProject,
    onSuccess: (success, projectId, context) => {
      if (success) {
        // To properly invalidate, we ideally need the tenantId.
        // For now, broadly invalidate all project queries or fetch tenantId if possible.
        // This assumes project IDs are globally unique or the deletion context provides tenantId.
        queryClient.invalidateQueries({ queryKey: ["projects"] }); // Broad invalidation
        queryClient.removeQueries({ queryKey: projectQueryKeys.detail(projectId) });
      }
    },
  });
}
