
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
import type { Segment, NewSegmentPayload } from "@/types";
import { formatFirestoreTimestamp } from "@/lib/utils/firestoreUtils";

const segmentsCollectionRef = collection(db, "segments");

const mapDocToSegment = (docSnapshot: any): Segment => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId,
    name: data.name,
    description: data.description,
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, "now"),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, "now"),
  } as Segment;
};

export const getSegments = async (tenantId: string): Promise<Segment[]> => {
  const q = query(
    segmentsCollectionRef,
    where("tenantId", "==", tenantId),
    orderBy("name", "asc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToSegment);
};

export const getSegmentById = async (segmentId: string): Promise<Segment | undefined> => {
  const segmentDocRef = doc(db, "segments", segmentId);
  const docSnapshot = await getDoc(segmentDocRef);
  if (docSnapshot.exists()) {
    return mapDocToSegment(docSnapshot);
  }
  return undefined;
};

export const addSegment = async (
  tenantId: string,
  segmentData: NewSegmentPayload
): Promise<Segment> => {
  const now = serverTimestamp();
  const newSegment = {
    ...segmentData,
    tenantId,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(segmentsCollectionRef, newSegment);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToSegment(newDocSnapshot);
  }
  throw new Error("Could not retrieve segment after creation.");
};

export const updateSegment = async (
  segmentId: string,
  segmentData: Partial<NewSegmentPayload>
): Promise<Segment | undefined> => {
  const segmentDocRef = doc(db, "segments", segmentId);
  await updateDoc(segmentDocRef, {
    ...segmentData,
    updatedAt: serverTimestamp(),
  });
  const updatedDocSnapshot = await getDoc(segmentDocRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToSegment(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteSegment = async (segmentId: string): Promise<boolean> => {
  const segmentDocRef = doc(db, "segments", segmentId);
  // Consider implications: remove segmentId from all contacts using it?
  await deleteDoc(segmentDocRef);
  return true;
};
