import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Tenant } from '@/types'; // Removed ChartOfAccountsTemplate as it's not directly used here.
import { createTenantChartOfAccountsFromTemplate } from './tenantChartOfAccountsService';

const tenantsCollectionRef = collection(db, 'tenants');

const formatFirestoreTimestamp = (timestamp: any, docId?: string, defaultDateOption: 'epoch' | 'now' = 'epoch'): string => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    try {
      const dateFromObject = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
      return dateFromObject.toISOString();
    } catch (e) {
      // Fall through
    }
  }

  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  const defaultDate = defaultDateOption === 'epoch' ? new Date(0) : new Date();
  return defaultDate.toISOString();
};


export const getTenants = async (): Promise<Tenant[]> => {
  const q = query(tenantsCollectionRef, orderBy("createdAt", "desc")); 
  const querySnapshot = await getDocs(q);
  
  const tenants = querySnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    const createdAtValue = formatFirestoreTimestamp(data.createdAt, docSnapshot.id);
    return { 
      id: docSnapshot.id, 
      name: data.name,
      createdAt: createdAtValue,
      chartOfAccountsTemplateId: data.chartOfAccountsTemplateId,
      chartOfAccountsId: data.chartOfAccountsId,
    } as Tenant;
  });
  return tenants;
};

export const getTenantById = async (id: string): Promise<Tenant | undefined> => {
  const tenantDocRef = doc(db, 'tenants', id);
  const docSnapshot = await getDoc(tenantDocRef);
  if (docSnapshot.exists()) {
    const data = docSnapshot.data();
    return { 
      id: docSnapshot.id, 
      name: data.name,
      createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id),
      chartOfAccountsTemplateId: data.chartOfAccountsTemplateId,
      chartOfAccountsId: data.chartOfAccountsId,
    } as Tenant;
  }
  return undefined;
};

// Type for new tenant data before Firestore interaction
interface NewTenantData {
    name: string;
    createdAt: any; // For serverTimestamp
    chartOfAccountsTemplateId?: string;
    chartOfAccountsId?: string;
}

export const addTenant = async (name: string, chartOfAccountsTemplateId?: string): Promise<Tenant> => {
  const newTenantFirestoreData: NewTenantData = {
    name,
    createdAt: serverTimestamp(),
  };

  if (chartOfAccountsTemplateId) {
    newTenantFirestoreData.chartOfAccountsTemplateId = chartOfAccountsTemplateId;
  }

  const docRef = await addDoc(tenantsCollectionRef, newTenantFirestoreData);
  
  let finalChartOfAccountsId: string | undefined = undefined;
  if (chartOfAccountsTemplateId && chartOfAccountsTemplateId !== "") {
    try {
      // Pass tenant name for better naming of the created COA
      const createdCoa = await createTenantChartOfAccountsFromTemplate(chartOfAccountsTemplateId, docRef.id, name); 
      if (createdCoa) {
        finalChartOfAccountsId = createdCoa.id;
        await updateDoc(docRef, { chartOfAccountsId: finalChartOfAccountsId });
      }
    } catch (error) {
      console.error("Error creating tenant chart of accounts from template:", error);
      // Tenant created, but COA creation failed. Tenant will have templateId but no chartOfAccountsId.
    }
  } else {
    // No template selected, create a blank CoA or handle as needed.
    // For now, we just won't create a specific CoA.
    console.log(`No chart of accounts template selected for tenant ${name}.`);
  }
  
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
      const data = newDocSnapshot.data();
      return {
          id: newDocSnapshot.id,
          name: data.name,
          createdAt: formatFirestoreTimestamp(data.createdAt, newDocSnapshot.id, 'now'),
          chartOfAccountsTemplateId: data.chartOfAccountsTemplateId,
          chartOfAccountsId: data.chartOfAccountsId, // This will be populated if COA was created and linked
      } as Tenant;
  }
  throw new Error("Could not retrieve tenant after creation.");
};

export const updateTenant = async (id: string, name: string): Promise<Tenant | undefined> => {
  const tenantDocRef = doc(db, 'tenants', id);
  // Assuming 'updatedAt' might be a field you want to manage
  await updateDoc(tenantDocRef, { name, updatedAt: serverTimestamp() }); 
  
  const updatedDocSnapshot = await getDoc(tenantDocRef);
  if (updatedDocSnapshot.exists()) {
    const data = updatedDocSnapshot.data();
    return { 
        id: updatedDocSnapshot.id,
        name: data.name,
        createdAt: formatFirestoreTimestamp(data.createdAt, updatedDocSnapshot.id),
        chartOfAccountsTemplateId: data.chartOfAccountsTemplateId,
        chartOfAccountsId: data.chartOfAccountsId,
        // updatedAt: formatFirestoreTimestamp(data.updatedAt, updatedDocSnapshot.id) // if you add updatedAt
    } as Tenant;
  }
  return undefined;
};

export const deleteTenant = async (id: string): Promise<boolean> => {
  const tenantDocRef = doc(db, 'tenants', id);
  // TODO: Optionally, also delete related data like tenantChartOfAccounts, users, journal entries
  // This requires careful consideration of cascading deletes or marking as inactive.
  // For now, only the tenant document is deleted.
  // Example: if (tenant.chartOfAccountsId) await deleteTenantChartOfAccounts(tenant.chartOfAccountsId);
  await deleteDoc(tenantDocRef);
  return true; 
};

