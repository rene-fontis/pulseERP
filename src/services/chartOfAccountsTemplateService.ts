import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { ChartOfAccountsTemplate, ChartOfAccountsTemplateFormValues } from '@/types';

const templatesCollectionRef = collection(db, 'chartOfAccountsTemplates');

const formatFirestoreTimestamp = (timestamp: any, defaultDateOption: 'epoch' | 'now' = 'epoch'): string => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    try {
      return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate().toISOString();
    } catch (e) { /* fallback */ }
  }
   // If it's already a string (e.g. from client-side generation before save), try to parse it
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return (defaultDateOption === 'epoch' ? new Date(0) : new Date()).toISOString();
};

const mapDocToTemplate = (docSnapshot: any): ChartOfAccountsTemplate => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    name: data.name,
    description: data.description || '',
    groups: data.groups ? data.groups.map((g: any) => ({
      ...g,
      id: g.id || crypto.randomUUID(), 
      accounts: g.accounts ? g.accounts.map((a: any) => ({ ...a, id: a.id || crypto.randomUUID(), description: a.description || '' })) : [],
    })) : [],
    createdAt: formatFirestoreTimestamp(data.createdAt, 'now'),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, 'now'),
  } as ChartOfAccountsTemplate;
};

export const getChartOfAccountsTemplates = async (): Promise<ChartOfAccountsTemplate[]> => {
  const q = query(templatesCollectionRef, orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToTemplate);
};

export const getChartOfAccountsTemplateById = async (id: string): Promise<ChartOfAccountsTemplate | undefined> => {
  const docRef = doc(db, 'chartOfAccountsTemplates', id);
  const docSnapshot = await getDoc(docRef);
  if (docSnapshot.exists()) {
    return mapDocToTemplate(docSnapshot);
  }
  return undefined;
};

export const addChartOfAccountsTemplate = async (templateData: ChartOfAccountsTemplateFormValues): Promise<ChartOfAccountsTemplate> => {
  const now = serverTimestamp();
  const newTemplate = {
    ...templateData,
    description: templateData.description || '',
    groups: templateData.groups.map(group => ({
      ...group,
      id: group.id || crypto.randomUUID(),
      accounts: group.accounts.map(account => ({
        ...account,
        id: account.id || crypto.randomUUID(),
        description: account.description || '',
      })),
    })),
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(templatesCollectionRef, newTemplate);
  const newDocSnapshot = await getDoc(docRef);
   if (newDocSnapshot.exists()) {
    return mapDocToTemplate(newDocSnapshot);
  }
  throw new Error("Could not retrieve template after creation.");
};

export const updateChartOfAccountsTemplate = async (id: string, templateData: Partial<ChartOfAccountsTemplateFormValues>): Promise<ChartOfAccountsTemplate | undefined> => {
  const docRef = doc(db, 'chartOfAccountsTemplates', id);
   const updateData: any = { ...templateData, updatedAt: serverTimestamp() };
   
   if (templateData.description === undefined) updateData.description = ''; // ensure empty string if undefined

   if (templateData.groups) {
    updateData.groups = templateData.groups.map(group => ({
        ...group,
        id: group.id || crypto.randomUUID(),
        accounts: group.accounts.map(account => ({
            ...account,
            id: account.id || crypto.randomUUID(),
            description: account.description || '',
        })),
    }));
   }

  await updateDoc(docRef, updateData);
  const updatedDocSnapshot = await getDoc(docRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToTemplate(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteChartOfAccountsTemplate = async (id: string): Promise<boolean> => {
  const docRef = doc(db, 'chartOfAccountsTemplates', id);
  await deleteDoc(docRef);
  return true;
};

