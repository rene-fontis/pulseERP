import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Contact, NewContactPayload } from "@/types";
import { formatFirestoreTimestamp } from "@/lib/utils/firestoreUtils";

const contactsCollectionRef = collection(db, "contacts");

const mapDocToContact = (docSnapshot: any): Contact => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId,
    name: data.name,
    firstName: data.firstName,
    companyName: data.companyName,
    address: data.address || { street: '', zip: '', city: '', country: '' },
    phone: data.phone,
    email: data.email,
    segmentIds: data.segmentIds || [],
    hourlyRate: data.hourlyRate === undefined ? null : data.hourlyRate, // Ensure undefined from DB becomes null
    isClient: data.isClient || false,
    isSupplier: data.isSupplier || false,
    isPartner: data.isPartner || false,
    notes: data.notes,
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, "now"),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, "now"),
  } as Contact;
};

export const getContacts = async (tenantId: string): Promise<Contact[]> => {
  const q = query(
    contactsCollectionRef,
    where("tenantId", "==", tenantId),
    orderBy("name", "asc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToContact);
};

export const getContactById = async (
  contactId: string
): Promise<Contact | undefined> => {
  const contactDocRef = doc(db, "contacts", contactId);
  const docSnapshot = await getDoc(contactDocRef);
  if (docSnapshot.exists()) {
    return mapDocToContact(docSnapshot);
  }
  return undefined;
};

export const addContact = async (
  contactData: NewContactPayload
): Promise<Contact> => {
  const now = serverTimestamp();
  const newContact: any = { // Use any temporarily for Firestore compatibility
    ...contactData,
    address: contactData.address || {},
    isClient: contactData.isClient || false,
    isSupplier: contactData.isSupplier || false,
    isPartner: contactData.isPartner || false,
    segmentIds: contactData.segmentIds || [],
    createdAt: now,
    updatedAt: now,
  };

  // Ensure hourlyRate is null if undefined, or the number value
  newContact.hourlyRate = (contactData.hourlyRate === undefined || contactData.hourlyRate === null) ? null : contactData.hourlyRate;


  const docRef = await addDoc(contactsCollectionRef, newContact);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToContact(newDocSnapshot);
  }
  throw new Error("Could not retrieve contact after creation.");
};

export const updateContact = async (
  contactId: string,
  contactData: Partial<NewContactPayload>
): Promise<Contact | undefined> => {
  const contactDocRef = doc(db, "contacts", contactId);
  const updateData: any = { ...contactData, updatedAt: serverTimestamp() };

  // Ensure address is handled correctly (merged, not overwritten if only partial address is provided)
  if (contactData.address) {
    const existingContact = await getContactById(contactId);
    if (existingContact) {
      updateData.address = { ...existingContact.address, ...contactData.address };
    }
  }
  
  // Ensure hourlyRate is null if undefined, or the number value
  if (contactData.hasOwnProperty('hourlyRate')) { // Check if hourlyRate key is present in the partial update
    updateData.hourlyRate = (contactData.hourlyRate === undefined || contactData.hourlyRate === null) ? null : contactData.hourlyRate;
  }


  await updateDoc(contactDocRef, updateData);
  const updatedDocSnapshot = await getDoc(contactDocRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToContact(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteContact = async (contactId: string): Promise<boolean> => {
  const contactDocRef = doc(db, "contacts", contactId);
  await deleteDoc(contactDocRef);
  return true;
};