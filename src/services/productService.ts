
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
import type { Product, NewProductPayload } from "@/types";
import { formatFirestoreTimestamp } from "@/lib/utils/firestoreUtils";

const getProductsCollectionRef = (tenantId: string) => 
  collection(db, 'tenants', tenantId, 'products');

const mapDocToProduct = (docSnapshot: any): Product => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId,
    itemNumber: data.itemNumber,
    name: data.name,
    description: data.description,
    unitPrice: data.unitPrice,
    purchasePrice: data.purchasePrice === undefined ? null : data.purchasePrice,
    taxRateId: data.taxRateId === undefined ? null : data.taxRateId,
    unit: data.unit,
    minimumQuantity: data.minimumQuantity === undefined ? null : data.minimumQuantity,
    stockOnHand: data.stockOnHand || 0,
    defaultWarehouseId: data.defaultWarehouseId === undefined ? null : data.defaultWarehouseId,
    categoryIds: data.categoryIds || [],
    customFields: data.customFields || {}, // Ensure customFields is mapped
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, "now"),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, "now"),
  } as Product;
};

export const getProducts = async (tenantId: string): Promise<Product[]> => {
  const productsCollectionRef = getProductsCollectionRef(tenantId);
  const q = query(productsCollectionRef, orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToProduct);
};

export const getProductById = async (tenantId: string, productId: string): Promise<Product | undefined> => {
    const productDocRef = doc(db, 'tenants', tenantId, 'products', productId);
    const docSnapshot = await getDoc(productDocRef);
    if (docSnapshot.exists()) {
        return mapDocToProduct(docSnapshot);
    }
    return undefined;
};

export const addProduct = async (
  tenantId: string,
  productData: NewProductPayload 
): Promise<Product> => {
  const productsCollectionRef = getProductsCollectionRef(tenantId);
  const now = serverTimestamp();
  const newProduct: any = {
    ...productData,
    tenantId,
    purchasePrice: productData.purchasePrice === undefined ? null : productData.purchasePrice,
    taxRateId: productData.taxRateId === undefined ? null : productData.taxRateId,
    minimumQuantity: productData.minimumQuantity === undefined ? null : productData.minimumQuantity,
    defaultWarehouseId: productData.defaultWarehouseId === undefined ? null : productData.defaultWarehouseId,
    stockOnHand: productData.stockOnHand || 0,
    categoryIds: productData.categoryIds || [],
    customFields: productData.customFields || {}, // Save customFields
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(productsCollectionRef, newProduct);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToProduct(newDocSnapshot);
  }
  throw new Error("Could not retrieve product after creation.");
};

export const updateProduct = async (
  tenantId: string,
  productId: string,
  productData: Partial<NewProductPayload> 
): Promise<Product | undefined> => {
  const productDocRef = doc(db, 'tenants', tenantId, 'products', productId);
  const updateData: any = { ...productData, updatedAt: serverTimestamp() };

  if (productData.hasOwnProperty('purchasePrice') && productData.purchasePrice === undefined) updateData.purchasePrice = null;
  if (productData.hasOwnProperty('taxRateId') && productData.taxRateId === undefined) updateData.taxRateId = null;
  if (productData.hasOwnProperty('minimumQuantity') && productData.minimumQuantity === undefined) updateData.minimumQuantity = null;
  if (productData.hasOwnProperty('defaultWarehouseId') && productData.defaultWarehouseId === undefined) updateData.defaultWarehouseId = null;
  if (productData.hasOwnProperty('customFields')) { // Ensure customFields are updated correctly
    updateData.customFields = productData.customFields || {};
  }
  
  await updateDoc(productDocRef, updateData);
  const updatedDocSnapshot = await getDoc(productDocRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToProduct(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteProduct = async (tenantId: string, productId: string): Promise<boolean> => {
  const productDocRef = doc(db, 'tenants', tenantId, 'products', productId);
  // Consider implications: stock movements, invoice lines etc.
  await deleteDoc(productDocRef);
  return true;
};
