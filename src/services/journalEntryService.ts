
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { JournalEntry, NewJournalEntryPayload } from '@/types';

const journalEntriesCollectionRef = collection(db, 'journalEntries');

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

const mapDocToJournalEntry = (docSnapshot: any): JournalEntry => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId,
    fiscalYearId: data.fiscalYearId,
    entryNumber: data.entryNumber,
    date: formatFirestoreTimestamp(data.date, 'now'),
    description: data.description,
    lines: data.lines ? data.lines.map((line: any) => ({
      ...line,
      id: line.id || crypto.randomUUID(), 
    })) : [],
    attachments: data.attachments || [],
    posted: data.posted || false,
    createdAt: formatFirestoreTimestamp(data.createdAt, 'now'),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, 'now'),
  } as JournalEntry;
};

export const getJournalEntries = async (tenantId: string, fiscalYearId?: string): Promise<JournalEntry[]> => {
  const queryConstraints = [
    where("tenantId", "==", tenantId),
    orderBy("date", "desc"),
    orderBy("entryNumber", "desc")
  ];

  if (fiscalYearId) {
    queryConstraints.unshift(where("fiscalYearId", "==", fiscalYearId));
  }
  
  const q = query(journalEntriesCollectionRef, ...queryConstraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToJournalEntry);
};

export const addJournalEntry = async (entryData: NewJournalEntryPayload): Promise<JournalEntry> => {
  const now = serverTimestamp();
  const newEntry = {
    ...entryData,
    date: Timestamp.fromDate(new Date(entryData.date)), // Store date as Firestore Timestamp
    lines: entryData.lines.map(line => ({ ...line, id: line.id || crypto.randomUUID() })),
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(journalEntriesCollectionRef, newEntry);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToJournalEntry(newDocSnapshot);
  }
  throw new Error("Could not retrieve journal entry after creation.");
};

export const updateJournalEntry = async (entryId: string, entryData: Partial<NewJournalEntryPayload>): Promise<JournalEntry | undefined> => {
  const docRef = doc(db, 'journalEntries', entryId);
  
  const updateData: any = { ...entryData, updatedAt: serverTimestamp() };
  if (entryData.date) {
    updateData.date = Timestamp.fromDate(new Date(entryData.date)); // Ensure date is stored as Timestamp
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