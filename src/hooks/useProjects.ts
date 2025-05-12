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
  lists: (tenantId: string, statusFilter?: ProjectStatus[]) => [...projectQueryKeys.all(tenantId), "list", ...(statusFilter || [])] as const,
  details: (tenantId: string) => [...projectQueryKeys.all(tenantId), "detail"] as const,
  detail: (projectId: string) => [...projectQueryKeys.details(""), projectId] as const,
};

export function useGetProjects(tenantId: string | null, statusFilter?: ProjectStatus[]) {
  return useQuery<Project[], Error>({
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
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists(tenantId) });
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists(tenantId, ['Active']) }); // Specific for active list
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
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists(data.tenantId) });
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(variables.projectId) });
        // Invalidate specific status lists if status changed
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists(data.tenantId, ['Active']) });
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists(data.tenantId, ['Archived']) });
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists(data.tenantId, ['Completed']) });
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
        // To properly invalidate, we'd need tenantId
        // For now, broadly invalidate or fetch tenantId from a cached project
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.removeQueries({ queryKey: projectQueryKeys.detail(projectId) });
      }
    },
  });
}