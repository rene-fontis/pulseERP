
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { JournalEntry, NewJournalEntryPayload, JournalEntryLine } from '@/types';
import { formatFirestoreTimestamp } from '@/lib/utils/firestoreUtils';

const journalEntriesCollectionRef = collection(db, 'journalEntries');

const mapDocToJournalEntry = (docSnapshot: any): JournalEntry => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId,
    fiscalYearId: data.fiscalYearId, 
    entryNumber: data.entryNumber,
    date: formatFirestoreTimestamp(data.date, docSnapshot.id, 'now'),
    description: data.description,
    lines: data.lines ? data.lines.map((line: any) => ({
      ...line,
      id: line.id || crypto.randomUUID(),
    })) : [],
    attachments: data.attachments || [], 
    posted: data.posted || false,
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, 'now'),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, 'now'),
  } as JournalEntry;
};

export const getJournalEntries = async (tenantId: string, fiscalYearId?: string): Promise<JournalEntry[]> => {
  const queryConstraints: any[] = [ 
    where("tenantId", "==", tenantId)
  ];

  if (fiscalYearId) {
    queryConstraints.push(where("fiscalYearId", "==", fiscalYearId));
  }
  // Order for display in journal view
  queryConstraints.push(orderBy("date", "desc")); 
  queryConstraints.push(orderBy("entryNumber", "desc")); 
  
  const q = query(journalEntriesCollectionRef, ...queryConstraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToJournalEntry);
};

export const getJournalEntriesBeforeDate = async (tenantId: string, date: Date): Promise<JournalEntry[]> => {
  const qConstraints = [
    where("tenantId", "==", tenantId),
    where("date", "<", Timestamp.fromDate(date)), // Entries strictly before the start date of the report period
    orderBy("date", "asc") 
  ];
  const q = query(journalEntriesCollectionRef, ...qConstraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToJournalEntry);
};


export const addJournalEntry = async (entryData: NewJournalEntryPayload): Promise<JournalEntry> => {
  const now = serverTimestamp();
  
  const newEntryDataForFirestore: { [key: string]: any } = { 
    ...entryData,
    date: Timestamp.fromDate(new Date(entryData.date)),
    createdAt: now,
    updatedAt: now,
  };

  if (newEntryDataForFirestore.fiscalYearId === undefined) {
    delete newEntryDataForFirestore.fiscalYearId;
  }
  if (newEntryDataForFirestore.attachments === undefined) {
    delete newEntryDataForFirestore.attachments;
  }

  if (newEntryDataForFirestore.lines && Array.isArray(newEntryDataForFirestore.lines)) {
    newEntryDataForFirestore.lines = newEntryDataForFirestore.lines.map((line: Partial<JournalEntryLine>) => {
      const sanitizedLine: { [key: string]: any } = { ...line }; 
      
      if (!sanitizedLine.id) { 
          sanitizedLine.id = crypto.randomUUID();
      }
      if (sanitizedLine.debit === undefined) {
        delete sanitizedLine.debit;
      }
      if (sanitizedLine.credit === undefined) {
        delete sanitizedLine.credit;
      }
      return sanitizedLine;
    });
  } else {
    newEntryDataForFirestore.lines = []; 
  }

  const docRef = await addDoc(journalEntriesCollectionRef, newEntryDataForFirestore);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToJournalEntry(newDocSnapshot);
  }
  throw new Error("Could not retrieve journal entry after creation.");
};

export const updateJournalEntry = async (entryId: string, entryData: Partial<NewJournalEntryPayload>): Promise<JournalEntry | undefined> => {
  const docRef = doc(db, 'journalEntries', entryId);
  
  const updateData: { [key: string]: any } = { ...entryData, updatedAt: serverTimestamp() };
  if (entryData.date) {
    updateData.date = Timestamp.fromDate(new Date(entryData.date));
  }

  if (updateData.fiscalYearId === undefined) {
    delete updateData.fiscalYearId;
  }
  if (updateData.attachments === undefined) {
    delete updateData.attachments;
  }

  if (updateData.lines && Array.isArray(updateData.lines)) {
    updateData.lines = updateData.lines.map((line: Partial<JournalEntryLine>) => {
      const sanitizedLine: { [key: string]: any } = { ...line };
      if (sanitizedLine.debit === undefined) delete sanitizedLine.debit;
      if (sanitizedLine.credit === undefined) delete sanitizedLine.credit;
      return sanitizedLine;
    });
  }

  await updateDoc(docRef, updateData);
  const updatedDocSnapshot = await getDoc(docRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToJournalEntry(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteJournalEntry = async (entryId: string): Promise<boolean> => {
  const docRef = doc(db, 'journalEntries', entryId);
  await deleteDoc(docRef);
  return true;
};

