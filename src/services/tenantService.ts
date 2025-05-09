import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from '@/lib/firebase'; // Import the initialized db from firebase.ts
import type { Tenant } from '@/types';

const tenantsCollectionRef = collection(db, 'tenants');

// Helper function to safely convert Firestore createdAt to ISO string
const formatFirestoreTimestamp = (timestamp: any, docId?: string, defaultDateOption: 'epoch' | 'now' = 'epoch'): string => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  // Check if it's a string and if it's a valid date representation
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toISOString(); // Normalize to ISO string if it's a parsable string
    }
  }
  
  // Fallback for undefined, null, or invalid string/number
  const defaultDate = defaultDateOption === 'epoch' ? new Date(0) : new Date();
  const idPart = docId ? `for tenant ID ${docId} ` : '';
  console.warn(`Invalid or missing createdAt value ${idPart}encountered: ${JSON.stringify(timestamp)}. Falling back to ${defaultDateOption} date: ${defaultDate.toISOString()}.`);
  return defaultDate.toISOString();
};


export const getTenants = async (): Promise<Tenant[]> => {
  const q = query(tenantsCollectionRef, orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      name: data.name,
      createdAt: formatFirestoreTimestamp(data.createdAt, doc.id) 
    } as Tenant;
  });
};

export const getTenantById = async (id: string): Promise<Tenant | undefined> => {
  const tenantDocRef = doc(db, 'tenants', id);
  const docSnapshot = await getDoc(tenantDocRef);
  if (docSnapshot.exists()) {
    const data = docSnapshot.data();
    return { 
      id: docSnapshot.id, 
      name: data.name,
      createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id) 
    } as Tenant;
  }
  return undefined;
};

export const addTenant = async (name: string): Promise<Tenant> => {
  const newTenantData = {
    name,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(tenantsCollectionRef, newTenantData);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
      const data = newDocSnapshot.data();
      return {
          id: newDocSnapshot.id,
          name: data.name,
          createdAt: formatFirestoreTimestamp(data.createdAt, newDocSnapshot.id, 'now'),
      } as Tenant;
  }
  throw new Error("Could not retrieve tenant after creation.");
};

export const updateTenant = async (id: string, name: string): Promise<Tenant | undefined> => {
  const tenantDocRef = doc(db, 'tenants', id);
  await updateDoc(tenantDocRef, { name }); // Note: this doesn't update 'updatedAt' or similar
  
  const updatedDocSnapshot = await getDoc(tenantDocRef);
  if (updatedDocSnapshot.exists()) {
    const data = updatedDocSnapshot.data();
    return { 
        id: updatedDocSnapshot.id,
        name: data.name,
        createdAt: formatFirestoreTimestamp(data.createdAt, updatedDocSnapshot.id)
    } as Tenant;
  }
  return undefined;
};

export const deleteTenant = async (id: string): Promise<boolean> => {
  const tenantDocRef = doc(db, 'tenants', id);
  await deleteDoc(tenantDocRef);
  return true; 
};
