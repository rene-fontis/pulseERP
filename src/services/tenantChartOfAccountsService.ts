import { collection, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { TenantChartOfAccounts, AccountGroup, Account, AccountTemplate, AccountGroupTemplate, TenantChartOfAccountsFormValues } from '@/types';
import { getChartOfAccountsTemplateById } from './chartOfAccountsTemplateService';

const tenantCoaCollectionRef = collection(db, 'tenantChartOfAccounts');

const formatFirestoreTimestamp = (timestamp: any, defaultDateOption: 'epoch' | 'now' = 'epoch'): string => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    try {
      return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate().toISOString();
    } catch (e) { /* fallback */ }
  }
   if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return (defaultDateOption === 'epoch' ? new Date(0) : new Date()).toISOString();
};

const mapDocToTenantCoa = (docSnapshot: any): TenantChartOfAccounts => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId,
    name: data.name,
    groups: data.groups ? data.groups.map((g: any) => ({
      ...g,
      id: g.id || crypto.randomUUID(),
      accounts: g.accounts ? g.accounts.map((a: any) => ({ 
        ...a, 
        id: a.id || crypto.randomUUID(),
        description: a.description || '', 
        balance: a.balance || 0, 
        isSystemAccount: a.isSystemAccount || false,
    })) : [],
    isFixed: g.isFixed || false,
    parentId: g.parentId !== undefined ? g.parentId : null,
    level: typeof g.level === 'number' ? g.level : (g.parentId ? 1 : 0),
    })) : [],
    createdAt: formatFirestoreTimestamp(data.createdAt, 'now'),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, 'now'),
  } as TenantChartOfAccounts;
};

export const createTenantChartOfAccountsFromTemplate = async (templateId: string, tenantId: string, tenantName: string): Promise<TenantChartOfAccounts | null> => {
  const template = await getChartOfAccountsTemplateById(templateId);
  if (!template) {
    console.error(`Template with ID ${templateId} not found.`);
    throw new Error(`Chart of Accounts Template with ID ${templateId} not found.`);
  }

  const now = serverTimestamp();
  
  const newTenantCoAGroups: AccountGroup[] = template.groups.map((groupTemplate: AccountGroupTemplate) => ({
    id: groupTemplate.id || crypto.randomUUID(), 
    name: groupTemplate.name,
    mainType: groupTemplate.mainType,
    accounts: groupTemplate.accounts.map((accountTemplate: AccountTemplate) => ({
      id: accountTemplate.id || crypto.randomUUID(), 
      number: accountTemplate.number,
      name: accountTemplate.name,
      description: accountTemplate.description || '',
      balance: 0, 
      isSystemAccount: accountTemplate.isSystemAccount || false,
    })),
    isFixed: groupTemplate.isFixed || false,
    parentId: groupTemplate.parentId !== undefined ? groupTemplate.parentId : null,
    level: typeof groupTemplate.level === 'number' ? groupTemplate.level : (groupTemplate.parentId ? 1 : 0),
  }));

  const newTenantCoADocData = {
    tenantId,
    name: `${tenantName} - Kontenplan (Vorlage: ${template.name})`,
    groups: newTenantCoAGroups,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(tenantCoaCollectionRef, newTenantCoADocData);
  const newDocSnapshot = await getDoc(docRef);

  if (newDocSnapshot.exists()) {
    return mapDocToTenantCoa(newDocSnapshot);
  }
  throw new Error("Could not retrieve Tenant Chart of Accounts after creation from template.");
};


export const getTenantChartOfAccountsById = async (coaId: string): Promise<TenantChartOfAccounts | undefined> => {
  if (!coaId) return undefined;
  const docRef = doc(db, 'tenantChartOfAccounts', coaId);
  const docSnapshot = await getDoc(docRef);
  if (docSnapshot.exists()) {
    return mapDocToTenantCoa(docSnapshot);
  }
  return undefined;
};

const processTenantCoAGroupData = (group: AccountGroup): AccountGroup => ({
    ...group,
    id: group.id || crypto.randomUUID(), 
    accounts: group.accounts.map(account => ({
        ...account,
        id: account.id || crypto.randomUUID(),
        description: account.description || '',
        balance: account.balance || 0,
        isSystemAccount: account.isSystemAccount || false,
    })),
    isFixed: group.isFixed || false,
    parentId: group.parentId !== undefined ? group.parentId : null,
    level: typeof group.level === 'number' ? group.level : (group.parentId ? 1 : 0),
});

export const updateTenantChartOfAccounts = async (coaId: string, data: TenantChartOfAccountsFormValues): Promise<TenantChartOfAccounts | undefined> => {
  const docRef = doc(db, 'tenantChartOfAccounts', coaId);
  
  const updatePayload: any = { ...data, updatedAt: serverTimestamp() };
  
  if (data.groups) {
    updatePayload.groups = data.groups.map(processTenantCoAGroupData);
   }

  await updateDoc(docRef, updatePayload);
  const updatedSnapshot = await getTenantChartOfAccountsById(coaId); // Use existing getter to ensure consistent mapping
  return updatedSnapshot;
};

export const deleteTenantChartOfAccounts = async (coaId: string): Promise<boolean> => {
  const docRef = doc(db, 'tenantChartOfAccounts', coaId);
  await deleteDoc(docRef);
  return true;
};
