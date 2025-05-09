
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { ChartOfAccountsTemplate, ChartOfAccountsTemplateFormValues, AccountGroupTemplate } from '@/types';

// Canonical IDs for fixed groups, must match those used in seeding/template creation
const fixedGroupCanonicalIds: Record<AccountGroupTemplate['mainType'], string> = {
  Asset: 'fixed_asset_group_global',
  Liability: 'fixed_liability_group_global',
  Equity: 'fixed_equity_group_global',
  Revenue: 'fixed_revenue_group_global',
  Expense: 'fixed_expense_group_global',
};

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
    groups: data.groups ? data.groups.map((g: any) => {
      let groupId = g.id;
      if (g.isFixed && (!groupId || typeof groupId !== 'string' || !Object.values(fixedGroupCanonicalIds).includes(groupId)) ) {
        // If fixed group from DB is missing ID, or has a non-canonical one, assign/correct it.
        groupId = fixedGroupCanonicalIds[g.mainType as AccountGroupTemplate['mainType']];
      } else if (!groupId) {
        groupId = crypto.randomUUID();
      }
      
      const accounts = g.accounts ? g.accounts.map((a: any) => ({
        ...a,
        id: a.id || crypto.randomUUID(),
        description: a.description || '',
        isSystemAccount: a.isSystemAccount || false,
        isRetainedEarningsAccount: a.isRetainedEarningsAccount || false,
      })) : [];

      return {
        ...g,
        id: groupId,
        accounts: accounts,
        isFixed: g.isFixed || false,
        parentId: g.parentId !== undefined ? g.parentId : null,
        level: typeof g.level === 'number' ? g.level : (g.parentId ? 1 : 0),
      };
    }) : [],
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

const processGroupData = (group: AccountGroupTemplate): AccountGroupTemplate => {
  let groupId = group.id;
  if (group.isFixed && (!groupId || typeof groupId !== 'string' || !Object.values(fixedGroupCanonicalIds).includes(groupId))) {
     groupId = fixedGroupCanonicalIds[group.mainType as AccountGroupTemplate['mainType']];
  } else if (!groupId) {
    groupId = crypto.randomUUID();
  }

  return {
  ...group,
  id: groupId,
  accounts: group.accounts.map(account => ({
    ...account,
    id: account.id || crypto.randomUUID(),
    description: account.description || '',
    isSystemAccount: account.isSystemAccount || false,
    isRetainedEarningsAccount: account.isRetainedEarningsAccount || false,
  })),
  isFixed: group.isFixed || false,
  parentId: group.parentId !== undefined ? group.parentId : null,
  level: typeof group.level === 'number' ? group.level : (group.parentId ? 1 : 0),
  };
};


export const addChartOfAccountsTemplate = async (templateData: ChartOfAccountsTemplateFormValues): Promise<ChartOfAccountsTemplate> => {
  const now = serverTimestamp();
  const newTemplate = {
    ...templateData,
    description: templateData.description || '',
    groups: templateData.groups.map(processGroupData),
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
   
   if (templateData.description === undefined && !updateData.hasOwnProperty('description')) {
     updateData.description = '';
   }


   if (templateData.groups) {
    updateData.groups = templateData.groups.map(processGroupData);
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

