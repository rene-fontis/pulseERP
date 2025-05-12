"use client";

import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProductCategory, NewProductCategoryPayload } from "@/types";
import { formatFirestoreTimestamp } from "@/lib/utils/firestoreUtils";

const getProductCategoriesCollectionRef = (tenantId: string) => 
  collection(db, 'tenants', tenantId, 'productCategories');

const mapDocToProductCategory = (docSnapshot: any): ProductCategory => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId,
    name: data.name,
    description: data.description,
    parentId: data.parentId || null,
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, "now"),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, "now"),
  } as ProductCategory;
};

export const getProductCategories = async (tenantId: string, parentId?: string | null): Promise<ProductCategory[]> => {
  const categoriesCollectionRef = getProductCategoriesCollectionRef(tenantId);
  const qConstraints: any[] = [orderBy("name", "asc")];

  if (parentId !== undefined) { // Allows filtering for top-level (parentId === null) or children of a specific parent
    qConstraints.unshift(where("parentId", "==", parentId));
  }
  
  const q = query(categoriesCollectionRef, ...qConstraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToProductCategory);
};

export const getProductCategoryById = async (tenantId: string, categoryId: string): Promise<ProductCategory | undefined> => {
    const categoryDocRef = doc(db, 'tenants', tenantId, 'productCategories', categoryId);
    const docSnapshot = await getDoc(categoryDocRef);
    if (docSnapshot.exists()) {
        return mapDocToProductCategory(docSnapshot);
    }
    return undefined;
};


export const addProductCategory = async (
  tenantId: string,
  categoryData: NewProductCategoryPayload
): Promise<ProductCategory> => {
  const categoriesCollectionRef = getProductCategoriesCollectionRef(tenantId);
  const now = serverTimestamp();
  const newCategory = {
    ...categoryData,
    tenantId, // Important: tenantId is added here, not from NewProductCategoryPayload
    parentId: categoryData.parentId === undefined ? null : categoryData.parentId,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(categoriesCollectionRef, newCategory);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToProductCategory(newDocSnapshot);
  }
  throw new Error("Could not retrieve product category after creation.");
};

export const updateProductCategory = async (
  tenantId: string,
  categoryId: string,
  categoryData: Partial<NewProductCategoryPayload>
): Promise<ProductCategory | undefined> => {
  const categoryDocRef = doc(db, 'tenants', tenantId, 'productCategories', categoryId);
  const updateData: any = { ...categoryData, updatedAt: serverTimestamp() };

  if (categoryData.hasOwnProperty('parentId') && categoryData.parentId === undefined) {
    updateData.parentId = null;
  }
  
  await updateDoc(categoryDocRef, updateData);
  const updatedDocSnapshot = await getDoc(categoryDocRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToProductCategory(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteProductCategory = async (tenantId: string, categoryId: string): Promise<boolean> => {
  const categoryDocRef = doc(db, 'tenants', tenantId, 'productCategories', categoryId);
  // TODO: Consider what happens to products in this category.
  // Option 1: Set categoryId to null/undefined for those products.
  // Option 2: Prevent deletion if products exist in this category.
  // Option 3: Allow deletion and products become uncategorized (current behavior).
  await deleteDoc(categoryDocRef);
  return true;
};
