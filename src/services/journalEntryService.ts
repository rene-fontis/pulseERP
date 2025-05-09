
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { JournalEntry, NewJournalEntryPayload, JournalEntryLine } from '@/types';

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
    fiscalYearId: data.fiscalYearId, // Will be undefined if not in Firestore
    entryNumber: data.entryNumber,
    date: formatFirestoreTimestamp(data.date, 'now'),
    description: data.description,
    lines: data.lines ? data.lines.map((line: any) => ({
      ...line,
      id: line.id || crypto.randomUUID(),
      // debit/credit will be number or undefined if not in Firestore
    })) : [],
    attachments: data.attachments || [], // Default to empty array if not in Firestore
    posted: data.posted || false,
    createdAt: formatFirestoreTimestamp(data.createdAt, 'now'),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, 'now'),
  } as JournalEntry;
};

export const getJournalEntries = async (tenantId: string, fiscalYearId?: string): Promise<JournalEntry[]> => {
  const queryConstraints: any[] = [ // Use any[] for queryConstraints to avoid TypeScript complexity with array spreading
    where("tenantId", "==", tenantId)
  ];

  if (fiscalYearId) {
    queryConstraints.push(where("fiscalYearId", "==", fiscalYearId));
  }
  queryConstraints.push(orderBy("date", "desc"));
  queryConstraints.push(orderBy("entryNumber", "desc"));
  
  const q = query(journalEntriesCollectionRef, ...queryConstraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToJournalEntry);
};

export const addJournalEntry = async (entryData: NewJournalEntryPayload): Promise<JournalEntry> => {
  const now = serverTimestamp();
  
  // Create a mutable copy to sanitize for Firestore
  const newEntryDataForFirestore: { [key: string]: any } = { // Use an index signature for flexible property deletion
    ...entryData,
    date: Timestamp.fromDate(new Date(entryData.date)),
    createdAt: now,
    updatedAt: now,
  };

  // Sanitize top-level optional fields
  if (newEntryDataForFirestore.fiscalYearId === undefined) {
    delete newEntryDataForFirestore.fiscalYearId;
  }
  if (newEntryDataForFirestore.attachments === undefined) {
    delete newEntryDataForFirestore.attachments;
  } else if (Array.isArray(newEntryDataForFirestore.attachments) && newEntryDataForFirestore.attachments.length === 0) {
    // Optionally remove empty attachments array, or ensure Firestore handles it.
    // For now, we'll let empty arrays be stored if they are not undefined.
  }


  // Sanitize fields within each line
  if (newEntryDataForFirestore.lines && Array.isArray(newEntryDataForFirestore.lines)) {
    newEntryDataForFirestore.lines = newEntryDataForFirestore.lines.map((line: Partial<JournalEntryLine>) => {
      const sanitizedLine: { [key: string]: any } = { ...line }; // Use index signature for line as well
      
      if (!sanitizedLine.id) { // Ensure line id is present, form should provide this
          sanitizedLine.id = crypto.randomUUID();
      }
      // If debit is undefined (or 0, depending on how you want to treat it), remove the key
      if (sanitizedLine.debit === undefined) {
        delete sanitizedLine.debit;
      }
      // If credit is undefined (or 0), remove the key
      if (sanitizedLine.credit === undefined) {
        delete sanitizedLine.credit;
      }
      if (sanitizedLine.description === undefined) {
          sanitizedLine.description = ''; // Default to empty string if undefined
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

  // Sanitize fields for update as well
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
      if (sanitizedLine.description === undefined) sanitizedLine.description = '';
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
