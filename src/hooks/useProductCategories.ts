"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductCategories,
  getProductCategoryById,
  addProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from "@/services/productCategoryService";
import type { ProductCategory, NewProductCategoryPayload } from "@/types";

const productCategoryQueryKeys = {
  all: (tenantId: string) => ["productCategories", tenantId] as const,
  lists: (tenantId: string, parentId?: string | null) => [...productCategoryQueryKeys.all(tenantId), "list", parentId === undefined ? "all" : (parentId || "root")] as const,
  details: (tenantId: string) => [...productCategoryQueryKeys.all(tenantId), "detail"] as const,
  detail: (tenantId: string, categoryId: string) => [...productCategoryQueryKeys.details(tenantId), categoryId] as const,
};

export function useGetProductCategories(tenantId: string | null, parentId?: string | null) {
  return useQuery<ProductCategory[], Error>({
    queryKey: productCategoryQueryKeys.lists(tenantId!, parentId),
    queryFn: () => (tenantId ? getProductCategories(tenantId, parentId) : Promise.resolve([])),
    enabled: !!tenantId,
  });
}

export function useGetProductCategoryById(tenantId: string | null, categoryId: string | null) {
    return useQuery<ProductCategory | undefined, Error>({
        queryKey: productCategoryQueryKeys.detail(tenantId!, categoryId!),
        queryFn: () => (tenantId && categoryId ? getProductCategoryById(tenantId, categoryId) : Promise.resolve(undefined)),
        enabled: !!tenantId && !!categoryId,
    });
}

export function useAddProductCategory(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<ProductCategory, Error, NewProductCategoryPayload>({
    mutationFn: (categoryData) => addProductCategory(tenantId, categoryData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productCategoryQueryKeys.lists(tenantId, data.parentId) });
      queryClient.invalidateQueries({ queryKey: productCategoryQueryKeys.lists(tenantId) }); // Invalidate all list if parentId is involved
    },
  });
}

export function useUpdateProductCategory(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    ProductCategory | undefined,
    Error,
    { categoryId: string; data: Partial<NewProductCategoryPayload> }
  >({
    mutationFn: ({ categoryId, data }) => updateProductCategory(tenantId, categoryId, data),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: productCategoryQueryKeys.lists(tenantId, data.parentId) });
        queryClient.invalidateQueries({ queryKey: productCategoryQueryKeys.lists(tenantId) });
        queryClient.invalidateQueries({ queryKey: productCategoryQueryKeys.detail(tenantId, variables.categoryId) });
      }
    },
  });
}

export function useDeleteProductCategory(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: (categoryId: string) => deleteProductCategory(tenantId, categoryId),
    onSuccess: (success, deletedCategoryId) => {
      if (success) {
        // Potentially need to know parentId to invalidate specific list, or invalidate all
        queryClient.invalidateQueries({ queryKey: productCategoryQueryKeys.all(tenantId) });
        queryClient.removeQueries({ queryKey: productCategoryQueryKeys.detail(tenantId, deletedCategoryId) });
      }
    },
  });
}
