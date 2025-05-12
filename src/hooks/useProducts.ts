"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
} from "@/services/productService";
import type { Product, NewProductPayload } from "@/types";

const productQueryKeys = {
  all: (tenantId: string) => ["products", tenantId] as const,
  lists: (tenantId: string) => [...productQueryKeys.all(tenantId), "list"] as const,
  details: (tenantId: string) => [...productQueryKeys.all(tenantId), "detail"] as const,
  detail: (tenantId: string, productId: string) => [...productQueryKeys.details(tenantId), productId] as const,
};

export function useGetProducts(tenantId: string | null) {
  return useQuery<Product[], Error>({
    queryKey: productQueryKeys.lists(tenantId!),
    queryFn: () => (tenantId ? getProducts(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  });
}

export function useGetProductById(tenantId: string | null, productId: string | null) {
    return useQuery<Product | undefined, Error>({
        queryKey: productQueryKeys.detail(tenantId!, productId!),
        queryFn: () => (tenantId && productId ? getProductById(tenantId, productId) : Promise.resolve(undefined)),
        enabled: !!tenantId && !!productId,
    });
}

export function useAddProduct(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<Product, Error, NewProductPayload>({
    mutationFn: (productData) => addProduct(tenantId, productData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists(tenantId) });
    },
  });
}

export function useUpdateProduct(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    Product | undefined,
    Error,
    { productId: string; data: Partial<NewProductPayload> }
  >({
    mutationFn: ({ productId, data }) => updateProduct(tenantId, productId, data),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: productQueryKeys.lists(tenantId) });
        queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(tenantId, variables.productId) });
      }
    },
  });
}

export function useDeleteProduct(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: (productId: string) => deleteProduct(tenantId, productId),
    onSuccess: (success, deletedProductId) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: productQueryKeys.lists(tenantId) });
        queryClient.removeQueries({ queryKey: productQueryKeys.detail(tenantId, deletedProductId) });
      }
    },
  });
}
