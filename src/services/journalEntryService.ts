
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
    entryNumber: data.entryNumber,
    date: formatFirestoreTimestamp(data.date, 'now'), // Date should also be a timestamp or consistently handled
    description: data.description,
    lines: data.lines ? data.lines.map((line: any) => ({
      ...line,
      id: line.id || crypto.randomUUID(), // Ensure line id
    })) : [],
    attachments: data.attachments || [],
    posted: data.posted || false,
    createdAt: formatFirestoreTimestamp(data.createdAt, 'now'),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, 'now'),
  } as JournalEntry;
};

export const getJournalEntries = async (tenantId: string): Promise<JournalEntry[]> => {
  const q = query(
    journalEntriesCollectionRef, 
    where("tenantId", "==", tenantId),
    orderBy("date", "desc"),
    orderBy("entryNumber", "desc") // Secondary sort by entry number if dates are same
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToJournalEntry);
};

export const addJournalEntry = async (entryData: NewJournalEntryPayload): Promise<JournalEntry> => {
  const now = serverTimestamp();
  // Convert date string back to Firestore Timestamp for consistent storage if needed, or ensure it's stored correctly.
  // For simplicity, assuming entryData.date is already an ISO string that Firestore can handle or just pass it as is if service stores strings.
  // If storing as Firestore Timestamp: date: Timestamp.fromDate(new Date(entryData.date))
  const newEntry = {
    ...entryData,
    lines: entryData.lines.map(line => ({ ...line, id: line.id || crypto.randomUUID() })), // ensure line IDs
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

// Placeholder - Edit functionality for journal entries is currently disabled in UI
export const updateJournalEntry = async (entryId: string, entryData: Partial<NewJournalEntryPayload>): Promise<JournalEntry | undefined> => {
  const docRef = doc(db, 'journalEntries', entryId);
  const updateData = { ...entryData, updatedAt: serverTimestamp() };
  await updateDoc(docRef, updateData);
  const updatedDocSnapshot = await getDoc(docRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToJournalEntry(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteJournalEntry = async (entryId: string): Promise<boolean> => {
  // In a real app, you might check if the entry is posted and prevent deletion or handle reversing entries.
  const docRef = doc(db, 'journalEntries', entryId);
  await deleteDoc(docRef);
  return true;
};
