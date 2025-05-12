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
  lists: (tenantId: string, statusFilter?: ProjectStatus[], contactId?: string) => 
    [...projectQueryKeys.all(tenantId), "list", statusFilter ? statusFilter.join('_') : "ALL_STATUSES", contactId || "ALL_CONTACTS"] as const,
  details: (tenantId: string) => [...projectQueryKeys.all(tenantId), "detail"] as const,
  detail: (projectId: string) => [...projectQueryKeys.details(""), projectId] as const, 
};

export function useGetProjects(tenantId: string | null, statusFilter?: ProjectStatus[], contactId?: string) {
  return useQuery<Project[], Error>({
    queryKey: projectQueryKeys.lists(tenantId!, statusFilter, contactId), 
    queryFn: () => (tenantId ? getProjects(tenantId, statusFilter, contactId) : Promise.resolve([])),
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
        queryClient.invalidateQueries({ queryKey: ["projects"] }); 
        queryClient.removeQueries({ queryKey: projectQueryKeys.detail(projectId) });
      }
    },
  });
}
