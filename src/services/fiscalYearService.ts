
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { FiscalYear, FiscalYearFormValues } from '@/types';
import { formatFirestoreTimestamp } from '@/lib/utils/firestoreUtils';

const getFiscalYearsCollectionRef = (tenantId: string) => collection(db, 'tenants', tenantId, 'fiscalYears');

const mapDocToFiscalYear = (docSnapshot: any): FiscalYear => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    name: data.name,
    startDate: formatFirestoreTimestamp(data.startDate, docSnapshot.id),
    endDate: formatFirestoreTimestamp(data.endDate, docSnapshot.id),
    isClosed: data.isClosed || false,
    carryForwardSourceFiscalYearId: data.carryForwardSourceFiscalYearId || null,
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, 'now'),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, 'now'),
  } as FiscalYear;
};

export const getFiscalYears = async (tenantId: string): Promise<FiscalYear[]> => {
  const fiscalYearsCollectionRef = getFiscalYearsCollectionRef(tenantId);
  const q = query(fiscalYearsCollectionRef, orderBy("startDate", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToFiscalYear);
};

export const getFiscalYearById = async (tenantId: string, fiscalYearId: string): Promise<FiscalYear | undefined> => {
    const fiscalYearDocRef = doc(db, 'tenants', tenantId, 'fiscalYears', fiscalYearId);
    const docSnapshot = await getDoc(fiscalYearDocRef);
    if (docSnapshot.exists()) {
      return mapDocToFiscalYear(docSnapshot);
    }
    return undefined;
  };

export const addFiscalYear = async (tenantId: string, fiscalYearData: FiscalYearFormValues): Promise<FiscalYear> => {
  const fiscalYearsCollectionRef = getFiscalYearsCollectionRef(tenantId);
  const now = serverTimestamp();
  const newFiscalYear = {
    ...fiscalYearData,
    startDate: Timestamp.fromDate(new Date(fiscalYearData.startDate)), // Store as Timestamp
    endDate: Timestamp.fromDate(new Date(fiscalYearData.endDate)),   // Store as Timestamp
    isClosed: false, // Default to not closed
    carryForwardSourceFiscalYearId: null,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(fiscalYearsCollectionRef, newFiscalYear);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToFiscalYear(newDocSnapshot);
  }
  throw new Error("Could not retrieve fiscal year after creation.");
};

export const updateFiscalYear = async (tenantId: string, fiscalYearId: string, fiscalYearData: Partial<FiscalYearFormValues & { isClosed: boolean; carryForwardSourceFiscalYearId: string | null }>): Promise<FiscalYear | undefined> => {
  const fiscalYearDocRef = doc(db, 'tenants', tenantId, 'fiscalYears', fiscalYearId);
  
  const updateData: any = { ...fiscalYearData, updatedAt: serverTimestamp() };
  if (fiscalYearData.startDate) {
    updateData.startDate = Timestamp.fromDate(new Date(fiscalYearData.startDate));
  }
  if (fiscalYearData.endDate) {
    updateData.endDate = Timestamp.fromDate(new Date(fiscalYearData.endDate));
  }
   if (fiscalYearData.hasOwnProperty('carryForwardSourceFiscalYearId')) {
    updateData.carryForwardSourceFiscalYearId = fiscalYearData.carryForwardSourceFiscalYearId;
  }


  await updateDoc(fiscalYearDocRef, updateData);
  const updatedDocSnapshot = await getDoc(fiscalYearDocRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToFiscalYear(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteFiscalYear = async (tenantId: string, fiscalYearId: string): Promise<boolean> => {
  const fiscalYearDocRef = doc(db, 'tenants', tenantId, 'fiscalYears', fiscalYearId);
  // Add checks: e.g., cannot delete if it's the active fiscal year or if it has journal entries.
  await deleteDoc(fiscalYearDocRef);
  return true;
};
