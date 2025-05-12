// src/services/userService.ts
"use client";

import { collection, getDocs, getFirestore, Timestamp, doc, getDoc, setDoc, serverTimestamp as fsServerTimestamp, query, orderBy, updateDoc } from "firebase/firestore"; // Added query, orderBy, updateDoc
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

// This function is now primarily used by the RegisterForm to ensure a Firestore document exists.
// It's more of an "ensureUserDoc" or "syncUserToFirestore" function.
export const addUserToFirestore = async (userId: string, userData: Omit<NewUserPayload, 'createdAt' | 'tenantIds'>): Promise<User> => {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      const dataToSave: NewUserPayload = {
          ...userData,
          tenantIds: [], // Initialize with empty tenantIds
          createdAt: fsServerTimestamp(), 
      };
      await setDoc(userDocRef, dataToSave);
    } else {
      // If user exists, only update if displayName or photoURL from provider is different
      // or if the form provided a displayName and it's different from Firestore.
      const existingData = docSnap.data() as User;
      const updates: Partial<User> = {};
      if (userData.displayName && existingData.displayName !== userData.displayName) {
        updates.displayName = userData.displayName;
      }
      if (userData.photoURL && existingData.photoURL !== userData.photoURL) {
        updates.photoURL = userData.photoURL;
      }
      if (Object.keys(updates).length > 0) {
        await updateDoc(userDocRef, { ...updates, updatedAt: fsServerTimestamp() });
      }
    }
    
    const newUserSnapshot = await getDoc(userDocRef); // Re-fetch to get potentially updated or newly created data
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
    throw new Error("Could not retrieve user after Firestore operation.");
};

// Placeholder for updateUser (e.g., for assigning tenants)
// export const updateUser = async (userId: string, data: Partial<User>): Promise<User | undefined> => {
//   const userDocRef = doc(db, "users", userId);
//   await updateDoc(userDocRef, { ...data, updatedAt: fsServerTimestamp() });
//   return getUserById(userId);
// };
