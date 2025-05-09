import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from '@/lib/firebase'; // Import the initialized db from firebase.ts
import type { Tenant } from '@/types';

const tenantsCollectionRef = collection(db, 'tenants');

// Helper function to safely convert Firestore createdAt to ISO string
const formatFirestoreTimestamp = (timestamp: any, docId?: string, defaultDateOption: 'epoch' | 'now' = 'epoch'): string => {
  // console.log(`[tenantService.ts] Formatting timestamp for doc ${docId}:`, timestamp, typeof timestamp);
  if (timestamp instanceof Timestamp) {
    // console.log(`[tenantService.ts]   Doc ${docId}: Is Firestore Timestamp. Value: ${timestamp.toDate().toISOString()}`);
    return timestamp.toDate().toISOString();
  }
  
  // Check for seconds and nanoseconds properties (common for Firestore Timestamps when not correctly identified as Timestamp instance)
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    // console.log(`[tenantService.ts]   Doc ${docId}: Looks like a Firestore Timestamp object (seconds/nanoseconds). Converting.`);
    try {
      const dateFromObject = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
      return dateFromObject.toISOString();
    } catch (e) {
      // console.warn(`[tenantService.ts]   Doc ${docId}: Error converting seconds/nanoseconds to Date:`, e);
      // Fall through to default handling if conversion fails
    }
  }

  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      // console.log(`[tenantService.ts]   Doc ${docId}: Is valid date string. Value: ${date.toISOString()}`);
      return date.toISOString();
    } else {
      // console.warn(`[tenantService.ts]   Doc ${docId}: Is string, but invalid date string: ${timestamp}`);
    }
  }
  
  const defaultDate = defaultDateOption === 'epoch' ? new Date(0) : new Date();
  const idPart = docId ? `for tenant ID ${docId} ` : '';
  // console.warn(`[tenantService.ts] Invalid or missing createdAt value ${idPart} encountered: ${JSON.stringify(timestamp)}. Falling back to ${defaultDateOption} date: ${defaultDate.toISOString()}.`);
  return defaultDate.toISOString();
};


export const getTenants = async (): Promise<Tenant[]> => {
  // console.log("[tenantService.ts] Fetching tenants from Firestore...");
  const q = query(tenantsCollectionRef, orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  // console.log(`[tenantService.ts] Fetched ${querySnapshot.docs.length} tenants.`);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    // console.log(`[tenantService.ts] Processing tenant doc ${doc.id}:`, data);
    const createdAtValue = formatFirestoreTimestamp(data.createdAt, doc.id);
    // console.log(`[tenantService.ts]   Formatted createdAt for ${doc.id}: ${createdAtValue}`);
    return { 
      id: doc.id, 
      name: data.name,
      createdAt: createdAtValue
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
  // console.log("[tenantService.ts] Tenant added with ID:", docRef.id);
  const newDocSnapshot = await getDoc(docRef); // Fetch the document to get the server-generated timestamp
  if (newDocSnapshot.exists()) {
      const data = newDocSnapshot.data();
      // console.log("[tenantService.ts] New tenant data after fetch:", data);
      return {
          id: newDocSnapshot.id,
          name: data.name,
          // 'now' is a better default here as we expect a fresh timestamp
          createdAt: formatFirestoreTimestamp(data.createdAt, newDocSnapshot.id, 'now'), 
      } as Tenant;
  }
  // console.error("[tenantService.ts] Could not retrieve tenant after creation for ID:", docRef.id);
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