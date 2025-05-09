import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Tenant } from '@/types';
import { createTenantChartOfAccountsFromTemplate, deleteTenantChartOfAccounts } from './tenantChartOfAccountsService';

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
  // console.warn(`Invalid timestamp for doc ${docId}:`, timestamp, `Returning default: ${defaultDate.toISOString()}`);
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
      activeFiscalYearId: data.activeFiscalYearId,
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
      activeFiscalYearId: data.activeFiscalYearId,
    } as Tenant;
  }
  return undefined;
};

// Type for new tenant data before Firestore interaction
interface NewTenantData {
    name: string;
    createdAt: any; // For serverTimestamp
    updatedAt: any; // For serverTimestamp
    chartOfAccountsTemplateId?: string;
    chartOfAccountsId?: string;
    activeFiscalYearId?: string;
}

export const addTenant = async (name: string, chartOfAccountsTemplateId?: string): Promise<Tenant> => {
  const now = serverTimestamp();
  const newTenantFirestoreData: NewTenantData = {
    name,
    createdAt: now,
    updatedAt: now,
  };

  if (chartOfAccountsTemplateId) {
    newTenantFirestoreData.chartOfAccountsTemplateId = chartOfAccountsTemplateId;
  }

  const docRef = await addDoc(tenantsCollectionRef, newTenantFirestoreData);
  
  let finalChartOfAccountsId: string | undefined = undefined;
  if (chartOfAccountsTemplateId && chartOfAccountsTemplateId !== "") {
    try {
      const createdCoa = await createTenantChartOfAccountsFromTemplate(chartOfAccountsTemplateId, docRef.id, name); 
      if (createdCoa) {
        finalChartOfAccountsId = createdCoa.id;
        await updateDoc(docRef, { chartOfAccountsId: finalChartOfAccountsId, updatedAt: serverTimestamp() });
      }
    } catch (error) {
      console.error("Error creating tenant chart of accounts from template:", error);
    }
  } else {
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
          chartOfAccountsId: data.chartOfAccountsId,
          activeFiscalYearId: data.activeFiscalYearId,
      } as Tenant;
  }
  throw new Error("Could not retrieve tenant after creation.");
};

export const updateTenant = async (id: string, dataToUpdate: Partial<Pick<Tenant, 'name' | 'activeFiscalYearId'>>): Promise<Tenant | undefined> => {
  const tenantDocRef = doc(db, 'tenants', id);
  await updateDoc(tenantDocRef, { ...dataToUpdate, updatedAt: serverTimestamp() }); 
  
  const updatedDocSnapshot = await getDoc(tenantDocRef);
  if (updatedDocSnapshot.exists()) {
    const data = updatedDocSnapshot.data();
    return { 
        id: updatedDocSnapshot.id,
        name: data.name,
        createdAt: formatFirestoreTimestamp(data.createdAt, updatedDocSnapshot.id),
        chartOfAccountsTemplateId: data.chartOfAccountsTemplateId,
        chartOfAccountsId: data.chartOfAccountsId,
        activeFiscalYearId: data.activeFiscalYearId,
        // updatedAt: formatFirestoreTimestamp(data.updatedAt, updatedDocSnapshot.id) // if you add updatedAt
    } as Tenant;
  }
  return undefined;
};

export const deleteTenant = async (id: string): Promise<boolean> => {
  const tenantDocRef = doc(db, 'tenants', id);
  const tenantSnapshot = await getDoc(tenantDocRef);

  if (tenantSnapshot.exists()) {
    const tenantData = tenantSnapshot.data() as Tenant;
    if (tenantData.chartOfAccountsId) {
      try {
        await deleteTenantChartOfAccounts(tenantData.chartOfAccountsId);
        console.log(`Successfully deleted chart of accounts ${tenantData.chartOfAccountsId} for tenant ${id}`);
      } catch (error) {
        console.error(`Error deleting chart of accounts ${tenantData.chartOfAccountsId} for tenant ${id}:`, error);
        // Potentially stop tenant deletion if CoA deletion fails, or log and continue
      }
    }
    // TODO: Delete fiscal years subcollection
    // const fiscalYearsRef = collection(db, 'tenants', id, 'fiscalYears');
    // const fiscalYearsSnapshot = await getDocs(fiscalYearsRef);
    // const deletePromises = fiscalYearsSnapshot.docs.map(fyDoc => deleteDoc(fyDoc.ref));
    // await Promise.all(deletePromises);
    // console.log(`Successfully deleted fiscal years for tenant ${id}`);

    await deleteDoc(tenantDocRef);
    console.log(`Successfully deleted tenant ${id}`);
    return true; 
  } else {
    console.warn(`Tenant with id ${id} not found for deletion.`);
    return false;
  }
};