
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Budget, BudgetFormValues } from '@/types';
import { formatFirestoreTimestamp } from '@/lib/utils/firestoreUtils'; // Assuming you have this utility

const budgetsCollectionRef = collection(db, 'budgets');

const mapDocToBudget = (docSnapshot: any): Budget => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId,
    name: data.name,
    description: data.description || '',
    scenario: data.scenario || 'Actual',
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, 'now'),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, 'now'),
  } as Budget;
};

export const getBudgets = async (tenantId: string): Promise<Budget[]> => {
  const q = query(budgetsCollectionRef, where("tenantId", "==", tenantId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToBudget);
};

export const getBudgetById = async (budgetId: string): Promise<Budget | undefined> => {
  const budgetDocRef = doc(db, 'budgets', budgetId);
  const docSnapshot = await getDoc(budgetDocRef);
  if (docSnapshot.exists()) {
    return mapDocToBudget(docSnapshot);
  }
  return undefined;
};

export const addBudget = async (tenantId: string, budgetData: BudgetFormValues): Promise<Budget> => {
  const now = serverTimestamp();
  const newBudget = {
    tenantId,
    ...budgetData,
    description: budgetData.description || '',
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(budgetsCollectionRef, newBudget);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToBudget(newDocSnapshot);
  }
  throw new Error("Could not retrieve budget after creation.");
};

export const updateBudget = async (budgetId: string, budgetData: Partial<BudgetFormValues>): Promise<Budget | undefined> => {
  const budgetDocRef = doc(db, 'budgets', budgetId);
  const updateData: any = { ...budgetData, updatedAt: serverTimestamp() };
  if (budgetData.description === undefined && !updateData.hasOwnProperty('description')) {
    updateData.description = '';
  }
  await updateDoc(budgetDocRef, updateData);
  const updatedDocSnapshot = await getDoc(budgetDocRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToBudget(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteBudget = async (budgetId: string): Promise<boolean> => {
  const budgetDocRef = doc(db, 'budgets', budgetId);
  // TODO: Consider deleting all associated budget entries as well, or handle orphaned entries.
  // For example, query budgetEntries collection where budgetId === budgetId and delete them.
  const budgetEntriesQuery = query(collection(db, 'budgetEntries'), where('budgetId', '==', budgetId));
  const budgetEntriesSnapshot = await getDocs(budgetEntriesQuery);
  const deletePromises = budgetEntriesSnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);

  await deleteDoc(budgetDocRef);
  return true;
};
