import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from '@/lib/firebase'; // Import the initialized db from firebase.ts
import type { Tenant } from '@/types';

const tenantsCollectionRef = collection(db, 'tenants');

// Helper function to safely convert Firestore createdAt to ISO string
const formatFirestoreTimestamp = (timestamp: any, docId?: string, defaultDateOption: 'epoch' | 'now' = 'epoch'): string => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    try {
      const dateFromObject = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
      return dateFromObject.toISOString();
    } catch (e) {
      // Fall through to default handling if conversion fails
    }
  }

  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  const defaultDate = defaultDateOption === 'epoch' ? new Date(0) : new Date();
  // const idPart = docId ? `for tenant ID ${docId} ` : '';
  // console.warn(`[tenantService.ts] Invalid or missing createdAt value ${idPart} encountered: ${JSON.stringify(timestamp)}. Falling back to ${defaultDateOption} date: ${defaultDate.toISOString()}.`);
  return defaultDate.toISOString();
};


export const getTenants = async (): Promise<Tenant[]> => {
  // console.log("[tenantService.ts] Fetching tenants from Firestore...");
  // Simplified query by removing orderBy to troubleshoot potential issues with 'createdAt' field
  const q = query(tenantsCollectionRef); 
  const querySnapshot = await getDocs(q);
  // console.log(`[tenantService.ts] Fetched ${querySnapshot.docs.length} tenants.`);
  
  // Sort tenants client-side if an order is still desired after fetching
  // This is a workaround if server-side ordering causes issues
  const tenants = querySnapshot.docs.map(doc => {
    const data = doc.data();
    const createdAtValue = formatFirestoreTimestamp(data.createdAt, doc.id);
    return { 
      id: doc.id, 
      name: data.name,
      createdAt: createdAtValue
    } as Tenant;
  });

  // Client-side sorting by date (descending)
  return tenants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  // console.log("[tenantService.ts] Tenant added with ID:", docRef.id);
  const newDocSnapshot = await getDoc(docRef); // Fetch the document to get the server-generated timestamp
  if (newDocSnapshot.exists()) {
      const data = newDocSnapshot.data();
      // console.log("[tenantService.ts] New tenant data after fetch:", data);
      return {
          id: newDocSnapshot.id,
          name: data.name,
          createdAt: formatFirestoreTimestamp(data.createdAt, newDocSnapshot.id, 'now'), 
      } as Tenant;
  }
  // console.error("[tenantService.ts] Could not retrieve tenant after creation for ID:", docRef.id);
  throw new Error("Could not retrieve tenant after creation.");
};

export const updateTenant = async (id: string, name: string): Promise<Tenant | undefined> => {
  const tenantDocRef = doc(db, 'tenants', id);
  await updateDoc(tenantDocRef, { name });
  
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
