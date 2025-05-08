import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from '@/lib/firebase'; // Import the initialized db from firebase.ts
import type { Tenant } from '@/types';

const tenantsCollectionRef = collection(db, 'tenants');

export const getTenants = async (): Promise<Tenant[]> => {
  // Simulate API delay if needed, or remove for direct Firestore access
  // await new Promise(resolve => setTimeout(resolve, 500)); 
  const q = query(tenantsCollectionRef, orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      name: data.name,
      // Ensure createdAt is a string (ISO format) as expected by the Tenant type
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : String(data.createdAt) 
    } as Tenant;
  });
};

export const getTenantById = async (id: string): Promise<Tenant | undefined> => {
  // await new Promise(resolve => setTimeout(resolve, 300));
  const tenantDocRef = doc(db, 'tenants', id);
  const docSnapshot = await getDoc(tenantDocRef);
  if (docSnapshot.exists()) {
    const data = docSnapshot.data();
    return { 
      id: docSnapshot.id, 
      name: data.name,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : String(data.createdAt) 
    } as Tenant;
  }
  return undefined;
};

export const addTenant = async (name: string): Promise<Tenant> => {
  // await new Promise(resolve => setTimeout(resolve, 500));
  const newTenantData = {
    name,
    createdAt: serverTimestamp(), // Use serverTimestamp for Firestore
  };
  const docRef = await addDoc(tenantsCollectionRef, newTenantData);
  // To return the full tenant object including the server-generated timestamp,
  // we fetch it again. Or, construct it partially if exact server timestamp isn't immediately needed.
  // For consistency and to match the previous mock, we'll assume createdAt will be a string.
  // Firestore's serverTimestamp will be a Timestamp object, so we'll need to convert it.
  // Or, for simplicity in this step, we can approximate or wait for a re-fetch.
  // Let's fetch the newly created document to get the actual data.
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
      const data = newDocSnapshot.data();
      return {
          id: newDocSnapshot.id,
          name: data.name,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(), // Fallback if not a Timestamp
      } as Tenant;
  }
  // This case should ideally not happen if addDoc was successful
  throw new Error("Could not retrieve tenant after creation.");
};

export const updateTenant = async (id: string, name: string): Promise<Tenant | undefined> => {
  // await new Promise(resolve => setTimeout(resolve, 500));
  const tenantDocRef = doc(db, 'tenants', id);
  await updateDoc(tenantDocRef, { name });
  
  const updatedDocSnapshot = await getDoc(tenantDocRef);
  if (updatedDocSnapshot.exists()) {
    const data = updatedDocSnapshot.data();
    return { 
        id: updatedDocSnapshot.id,
        name: data.name,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : String(data.createdAt)
    } as Tenant;
  }
  return undefined;
};

export const deleteTenant = async (id: string): Promise<boolean> => {
  // await new Promise(resolve => setTimeout(resolve, 500));
  const tenantDocRef = doc(db, 'tenants', id);
  await deleteDoc(tenantDocRef);
  // Firestore deleteDoc doesn't return a boolean indicating success in the same way a filter might.
  // We assume success if no error is thrown.
  // To confirm deletion, you could try to getDoc(tenantDocRef) and check if it exists.
  // For simplicity here, we'll return true if no error.
  return true; 
};
