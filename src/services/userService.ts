// src/services/userService.ts
"use client";

import { collection, getDocs, getFirestore, Timestamp, doc, getDoc, setDoc, serverTimestamp as fsServerTimestamp, query, orderBy } from "firebase/firestore"; // Added query, orderBy
import { app } from '@/lib/firebase'; 
import type { User, NewUserPayload } from '@/types'; 
import { formatFirestoreTimestamp } from "@/lib/utils/firestoreUtils";


const db = getFirestore(app);
const usersCollectionRef = collection(db, "users");


export const getUsers = async (): Promise<User[]> => {
  if (!usersCollectionRef) {
    console.warn("Users collection reference is not initialized.");
    return [];
  }
  // Order users by creation date, newest first, for more predictable listing.
  const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
        id: docSnapshot.id,
        email: data.email,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        // Ensure createdAt is consistently formatted as an ISO string
        createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, 'now'),
        tenantIds: data.tenantIds || [],
    } as User;
  });
};

export const getUserById = async (userId: string): Promise<User | undefined> => {
    const userDocRef = doc(db, "users", userId);
    const docSnapshot = await getDoc(userDocRef);
    if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        return {
            id: docSnapshot.id,
            email: data.email,
            displayName: data.displayName || null,
            photoURL: data.photoURL || null,
            createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, 'now'),
            tenantIds: data.tenantIds || [],
        } as User;
    }
    return undefined;
};

export const addUser = async (userId: string, userData: Omit<NewUserPayload, 'createdAt'>): Promise<User> => {
    const userDocRef = doc(db, "users", userId);
    const dataToSave: NewUserPayload = {
        ...userData,
        createdAt: fsServerTimestamp(), 
    };
    await setDoc(userDocRef, dataToSave);
    const newUserSnapshot = await getDoc(userDocRef);
    if (newUserSnapshot.exists()) {
        const data = newUserSnapshot.data();
        return {
            id: newUserSnapshot.id,
            email: data.email,
            displayName: data.displayName || null,
            photoURL: data.photoURL || null,
            createdAt: formatFirestoreTimestamp(data.createdAt, newUserSnapshot.id, 'now'),
            tenantIds: data.tenantIds || [],
        } as User;
    }
    throw new Error("Could not retrieve user after creation.");
};

// Placeholder for updateUser if needed
// export const updateUser = async (userId: string, data: Partial<User>): Promise<User | undefined> => {
//   const userDocRef = doc(db, "users", userId);
//   await updateDoc(userDocRef, data);
//   return getUserById(userId);
// };
