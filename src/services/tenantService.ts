
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Tenant } from '@/types';
import { createTenantChartOfAccountsFromTemplate, deleteTenantChartOfAccounts } from './tenantChartOfAccountsService';
import { formatFirestoreTimestamp } from '@/lib/utils/firestoreUtils';

const tenantsCollectionRef = collection(db, 'tenants');


export const getTenants = async (): Promise<Tenant[]> => {
  const q = query(tenantsCollectionRef, orderBy("createdAt", "desc")); 
  const querySnapshot = await getDocs(q);
  
  const tenants = querySnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    const createdAtValue = formatFirestoreTimestamp(data.createdAt, docSnapshot.id, 'now');
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
      createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, 'now'),
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
      // Optionally, re-throw the error or handle it as per application requirements
      // For now, we'll let the tenant creation proceed without a CoA if this fails
    }
  } else {
    // Create an empty Chart of Accounts if no template is selected
    console.log(`No chart of accounts template selected for tenant ${name}. Creating an empty CoA.`);
    try {
        const emptyGroups = [ // Define the 5 fixed groups
            { id: 'fixed_asset_group_global', name: "Aktiven", mainType: "Asset", accounts: [], isFixed: true, parentId: null, level: 0, balance: 0 },
            { id: 'fixed_liability_group_global', name: "Passiven", mainType: "Liability", accounts: [], isFixed: true, parentId: null, level: 0, balance: 0 },
            { 
                id: 'fixed_equity_group_global', 
                name: "Eigenkapital", 
                mainType: "Equity", 
                accounts: [
                    { id: crypto.randomUUID(), number: "2970", name: "Gewinnvortrag / Verlustvortrag", description: "Vorjahresergebnis", isSystemAccount: false, balance: 0, isRetainedEarningsAccount: true },
                    // { id: crypto.randomUUID(), number: "2979", name: "Laufender Gewinn/Verlust", description: "Ergebnis des Geschäftsjahres. Systemkonto.", isSystemAccount: true, balance: 0 },
                ], 
                isFixed: true, parentId: null, level: 0, balance: 0 
            },
            { id: 'fixed_revenue_group_global', name: "Ertrag", mainType: "Revenue", accounts: [], isFixed: true, parentId: null, level: 0, balance: 0 },
            { id: 'fixed_expense_group_global', name: "Aufwand", mainType: "Expense", accounts: [], isFixed: true, parentId: null, level: 0, balance: 0 },
        ];

        const emptyCoADocData = {
            tenantId: docRef.id,
            name: `${name} - Kontenplan (Leer)`,
            groups: emptyGroups,
            createdAt: now,
            updatedAt: now,
        };
        const coaDocRef = await addDoc(collection(db, 'tenantChartOfAccounts'), emptyCoADocData);
        finalChartOfAccountsId = coaDocRef.id;
        await updateDoc(docRef, { chartOfAccountsId: finalChartOfAccountsId, updatedAt: serverTimestamp() });
    } catch (error) {
        console.error("Error creating empty tenant chart of accounts:", error);
    }
  }
  
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
      const data = newDocSnapshot.data();
      return {
          id: newDocSnapshot.id,
          name: data.name,
          createdAt: formatFirestoreTimestamp(data.createdAt, newDocSnapshot.id, 'now'),
          chartOfAccountsTemplateId: data.chartOfAccountsTemplateId,
          chartOfAccountsId: data.chartOfAccountsId, // This will be the ID of the generated CoA
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
        createdAt: formatFirestoreTimestamp(data.createdAt, updatedDocSnapshot.id, 'now'),
        chartOfAccountsTemplateId: data.chartOfAccountsTemplateId,
        chartOfAccountsId: data.chartOfAccountsId,
        activeFiscalYearId: data.activeFiscalYearId,
    } as Tenant;
  }
  return undefined;
};

export const deleteTenant = async (id: string): Promise<boolean> => {
  const tenantDocRef = doc(db, 'tenants', id);
  const tenantSnapshot = await getDoc(tenantDocRef);

  if (tenantSnapshot.exists()) {
    const tenantData = tenantSnapshot.data();
    if (tenantData.chartOfAccountsId) {
      try {
        await deleteTenantChartOfAccounts(tenantData.chartOfAccountsId);
        console.log(`Successfully deleted chart of accounts ${tenantData.chartOfAccountsId} for tenant ${id}`);
      } catch (error) {
        console.error(`Error deleting chart of accounts ${tenantData.chartOfAccountsId} for tenant ${id}:`, error);
        // Decide if you want to stop tenant deletion or continue
      }
    }
    // TODO: Delete fiscal years subcollection
    // const fiscalYearsRef = collection(db, 'tenants', id, 'fiscalYears');
    // const fiscalYearsSnapshot = await getDocs(fiscalYearsRef);
    // const deletePromises = fiscalYearsSnapshot.docs.map(fyDoc => deleteDoc(fyDoc.ref));
    // await Promise.all(deletePromises);
    // console.log(`Successfully deleted fiscal years for tenant ${id}`);

    // TODO: Delete budgets and budgetEntries subcollections or related documents
    // Query and delete budgets for the tenant, then query and delete budgetEntries for each budget

    await deleteDoc(tenantDocRef);
    console.log(`Successfully deleted tenant ${id}`);
    return true; 
  } else {
    console.warn(`Tenant with id ${id} not found for deletion.`);
    return false;
  }
};

