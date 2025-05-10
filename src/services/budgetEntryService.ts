
"use client";

import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { BudgetEntry, NewBudgetEntryPayload } from '@/types';
import { formatFirestoreTimestamp } from '@/lib/utils/firestoreUtils'; 

const budgetEntriesCollectionRef = collection(db, 'budgetEntries');

const mapDocToBudgetEntry = (docSnapshot: any): BudgetEntry => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    budgetId: data.budgetId,
    accountId: data.accountId,
    accountNumber: data.accountNumber,
    accountName: data.accountName,
    counterAccountId: data.counterAccountId,
    counterAccountNumber: data.counterAccountNumber,
    counterAccountName: data.counterAccountName,
    description: data.description,
    amountActual: data.amountActual,
    amountBestCase: data.amountBestCase, // Can be null/undefined
    amountWorstCase: data.amountWorstCase, // Can be null/undefined
    type: data.type,
    startDate: data.startDate ? formatFirestoreTimestamp(data.startDate) : undefined,
    endDate: data.endDate ? formatFirestoreTimestamp(data.endDate) : undefined,
    isRecurring: data.isRecurring || false,
    recurrence: data.recurrence || 'None',
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, 'now'),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, 'now'),
  } as BudgetEntry;
};

export const getBudgetEntries = async (budgetId: string): Promise<BudgetEntry[]> => {
  const q = query(budgetEntriesCollectionRef, where("budgetId", "==", budgetId), orderBy("startDate", "asc"), orderBy("createdAt", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToBudgetEntry);
};

export const getBudgetEntryById = async (entryId: string): Promise<BudgetEntry | undefined> => {
    const entryDocRef = doc(db, 'budgetEntries', entryId);
    const docSnapshot = await getDoc(entryDocRef);
    if (docSnapshot.exists()) {
        return mapDocToBudgetEntry(docSnapshot);
    }
    return undefined;
};

export const addBudgetEntry = async (newEntryData: NewBudgetEntryPayload): Promise<BudgetEntry> => {
  const now = serverTimestamp();
  
  const dataToSave: any = {
    ...newEntryData, // Includes amountActual, amountBestCase, amountWorstCase
    isRecurring: newEntryData.isRecurring || false,
    recurrence: newEntryData.recurrence || 'None',
    createdAt: now,
    updatedAt: now,
  };

  if (newEntryData.startDate) dataToSave.startDate = Timestamp.fromDate(new Date(newEntryData.startDate));
  else delete dataToSave.startDate; 

  if (newEntryData.endDate) dataToSave.endDate = Timestamp.fromDate(new Date(newEntryData.endDate));
  else delete dataToSave.endDate; 
  
  if (!newEntryData.accountNumber) delete dataToSave.accountNumber;
  if (!newEntryData.accountName) delete dataToSave.accountName;
  if (!newEntryData.counterAccountId) delete dataToSave.counterAccountId;
  if (!newEntryData.counterAccountNumber) delete dataToSave.counterAccountNumber;
  if (!newEntryData.counterAccountName) delete dataToSave.counterAccountName;

  // Ensure optional amounts are stored as null if undefined or empty, or the value if present
  dataToSave.amountBestCase = newEntryData.amountBestCase === undefined || newEntryData.amountBestCase === null ? null : newEntryData.amountBestCase;
  dataToSave.amountWorstCase = newEntryData.amountWorstCase === undefined || newEntryData.amountWorstCase === null ? null : newEntryData.amountWorstCase;


  const docRef = await addDoc(budgetEntriesCollectionRef, dataToSave);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToBudgetEntry(newDocSnapshot);
  }
  throw new Error("Could not retrieve budget entry after creation.");
};

export const updateBudgetEntry = async (entryId: string, entryData: Partial<NewBudgetEntryPayload>): Promise<BudgetEntry | undefined> => {
  const entryDocRef = doc(db, 'budgetEntries', entryId);
  
  const updateData: any = { ...entryData, updatedAt: serverTimestamp() };

  if (entryData.startDate) updateData.startDate = Timestamp.fromDate(new Date(entryData.startDate));
  else if (entryData.hasOwnProperty('startDate') && entryData.startDate === undefined) updateData.startDate = null; 

  if (entryData.endDate) updateData.endDate = Timestamp.fromDate(new Date(entryData.endDate));
  else if (entryData.hasOwnProperty('endDate') && entryData.endDate === undefined) updateData.endDate = null; 

  if (entryData.hasOwnProperty('counterAccountId') && (entryData.counterAccountId === undefined || entryData.counterAccountId === '')) {
    updateData.counterAccountId = null;
    updateData.counterAccountNumber = null;
    updateData.counterAccountName = null;
  }

  // Handle optional amounts for update
  if (entryData.hasOwnProperty('amountBestCase')) {
    updateData.amountBestCase = entryData.amountBestCase === undefined || entryData.amountBestCase === null ? null : entryData.amountBestCase;
  }
  if (entryData.hasOwnProperty('amountWorstCase')) {
    updateData.amountWorstCase = entryData.amountWorstCase === undefined || entryData.amountWorstCase === null ? null : entryData.amountWorstCase;
  }


  await updateDoc(entryDocRef, updateData);
  const updatedDocSnapshot = await getDoc(entryDocRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToBudgetEntry(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteBudgetEntry = async (entryId: string): Promise<boolean> => {
  const entryDocRef = doc(db, 'budgetEntries', entryId);
  await deleteDoc(entryDocRef);
  return true;
};

    