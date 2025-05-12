"use client";

import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TimeEntry, NewTimeEntryPayload } from "@/types";
import { formatFirestoreTimestamp } from "@/lib/utils/firestoreUtils";

const timeEntriesCollectionRef = collection(db, "timeEntries");

const mapDocToTimeEntry = (docSnapshot: any): TimeEntry => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId,
    userId: data.userId,
    contactId: data.contactId || null,
    projectId: data.projectId || null,
    taskId: data.taskId || null,
    date: formatFirestoreTimestamp(data.date, docSnapshot.id, "now"),
    hours: data.hours,
    description: data.description,
    rate: data.rate === undefined ? null : data.rate,
    isBillable: data.isBillable || false,
    invoicedId: data.invoicedId || null,
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, "now"),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, "now"),
  } as TimeEntry;
};

export const getTimeEntries = async (
  tenantId: string,
  filters?: { contactId?: string; projectId?: string; taskId?: string; userId?: string; startDate?: string; endDate?: string }
): Promise<TimeEntry[]> => {
  const qConstraints: any[] = [
    where("tenantId", "==", tenantId),
    orderBy("date", "desc"),
    orderBy("createdAt", "desc")
  ];

  if (filters?.contactId) qConstraints.push(where("contactId", "==", filters.contactId));
  if (filters?.projectId) qConstraints.push(where("projectId", "==", filters.projectId));
  if (filters?.taskId) qConstraints.push(where("taskId", "==", filters.taskId));
  if (filters?.userId) qConstraints.push(where("userId", "==", filters.userId));
  if (filters?.startDate) qConstraints.push(where("date", ">=", Timestamp.fromDate(new Date(filters.startDate))));
  if (filters?.endDate) qConstraints.push(where("date", "<=", Timestamp.fromDate(new Date(filters.endDate))));
  
  const q = query(timeEntriesCollectionRef, ...qConstraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToTimeEntry);
};

export const getTimeEntryById = async (entryId: string): Promise<TimeEntry | undefined> => {
    const entryDocRef = doc(db, "timeEntries", entryId);
    const docSnapshot = await getDoc(entryDocRef);
    if (docSnapshot.exists()) {
        return mapDocToTimeEntry(docSnapshot);
    }
    return undefined;
}

export const addTimeEntry = async (entryData: NewTimeEntryPayload, userId: string): Promise<TimeEntry> => {
  const now = serverTimestamp();
  const dataToSave: any = {
    ...entryData,
    userId, // Assuming userId is passed from the auth context or similar
    date: Timestamp.fromDate(new Date(entryData.date)),
    isBillable: entryData.isBillable || false,
    createdAt: now,
    updatedAt: now,
  };

  if (entryData.contactId === undefined) dataToSave.contactId = null;
  if (entryData.projectId === undefined) dataToSave.projectId = null;
  if (entryData.taskId === undefined) dataToSave.taskId = null;
  if (entryData.rate === undefined) dataToSave.rate = null;
  if (entryData.invoicedId === undefined) dataToSave.invoicedId = null;
  if (entryData.description === undefined) dataToSave.description = null;


  const docRef = await addDoc(timeEntriesCollectionRef, dataToSave);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToTimeEntry(newDocSnapshot);
  }
  throw new Error("Could not retrieve time entry after creation.");
};

export const updateTimeEntry = async (
  entryId: string,
  entryData: Partial<NewTimeEntryPayload>
): Promise<TimeEntry | undefined> => {
  const entryDocRef = doc(db, "timeEntries", entryId);
  const updateData: any = { ...entryData, updatedAt: serverTimestamp() };

  if (entryData.date) {
    updateData.date = Timestamp.fromDate(new Date(entryData.date));
  }

  if (entryData.hasOwnProperty('contactId') && entryData.contactId === undefined) updateData.contactId = null;
  if (entryData.hasOwnProperty('projectId') && entryData.projectId === undefined) updateData.projectId = null;
  if (entryData.hasOwnProperty('taskId') && entryData.taskId === undefined) updateData.taskId = null;
  if (entryData.hasOwnProperty('rate') && entryData.rate === undefined) updateData.rate = null;
  if (entryData.hasOwnProperty('invoicedId') && entryData.invoicedId === undefined) updateData.invoicedId = null;
  if (entryData.hasOwnProperty('description') && entryData.description === undefined) updateData.description = null;


  await updateDoc(entryDocRef, updateData);
  const updatedDocSnapshot = await getDoc(entryDocRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToTimeEntry(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteTimeEntry = async (entryId: string): Promise<boolean> => {
  const entryDocRef = doc(db, "timeEntries", entryId);
  await deleteDoc(entryDocRef);
  return true;
};