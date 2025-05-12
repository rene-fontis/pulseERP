
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
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Project, Milestone, NewProjectPayload, NewMilestonePayload, ProjectStatus } from "@/types";
import { formatFirestoreTimestamp } from "@/lib/utils/firestoreUtils";

const projectsCollectionRef = collection(db, "projects");

const mapDocToProject = (docSnapshot: any): Project => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    tenantId: data.tenantId,
    name: data.name,
    description: data.description,
    contactId: data.contactId || null,
    contactName: data.contactName || null,
    startDate: data.startDate ? formatFirestoreTimestamp(data.startDate, docSnapshot.id, 'now') : null,
    endDate: data.endDate ? formatFirestoreTimestamp(data.endDate, docSnapshot.id, 'now') : null,
    status: data.status || 'Active',
    milestones: (data.milestones || []).map((ms: any) => ({
      ...ms,
      id: ms.id || crypto.randomUUID(),
      dueDate: ms.dueDate ? formatFirestoreTimestamp(ms.dueDate, ms.id, 'now') : null,
      createdAt: formatFirestoreTimestamp(ms.createdAt, ms.id, 'now'), // Default to 'now' if missing
      updatedAt: formatFirestoreTimestamp(ms.updatedAt, ms.id, 'now'), // Default to 'now' if missing
    })),
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, "now"),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, "now"),
  } as Project;
};

export const getProjects = async (tenantId: string, statusFilter?: ProjectStatus[]): Promise<Project[]> => {
  const qConstraints: any[] = [ // Use any[] for queryConstraints to satisfy TS for push
    where("tenantId", "==", tenantId),
    orderBy("createdAt", "desc")
  ];
  if (statusFilter && statusFilter.length > 0) {
    qConstraints.push(where("status", "in", statusFilter));
  }
  
  const q = query(projectsCollectionRef, ...qConstraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToProject);
};

export const getProjectById = async (projectId: string): Promise<Project | undefined> => {
  const projectDocRef = doc(db, "projects", projectId);
  const docSnapshot = await getDoc(projectDocRef);
  if (docSnapshot.exists()) {
    return mapDocToProject(docSnapshot);
  }
  return undefined;
};

export const addProject = async (tenantId: string, projectData: NewProjectPayload): Promise<Project> => {
  const now = serverTimestamp();
  const newProjectData: any = {
    ...projectData,
    tenantId,
    status: projectData.status || 'Active',
    milestones: (projectData.milestones || []).map(ms => {
      // ms is Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>
      // ms.dueDate is string | null
      const milestoneToAdd: any = {
        id: crypto.randomUUID(),
        name: ms.name,
        description: ms.description === undefined ? null : ms.description,
        completed: ms.completed,
        dueDate: ms.dueDate ? Timestamp.fromDate(new Date(ms.dueDate)) : null,
        createdAt: now, // Use serverTimestamp for new milestones within a new project
        updatedAt: now,
      };
      if (ms.description === undefined) {
          delete milestoneToAdd.description; // Firestore omits undefined fields
      }
      return milestoneToAdd;
    }),
    createdAt: now,
    updatedAt: now,
  };
  
  if (projectData.startDate) newProjectData.startDate = Timestamp.fromDate(new Date(projectData.startDate));
  if (projectData.endDate) newProjectData.endDate = Timestamp.fromDate(new Date(projectData.endDate));
  if (!projectData.contactId) newProjectData.contactId = null;


  const docRef = await addDoc(projectsCollectionRef, newProjectData);
  const newDocSnapshot = await getDoc(docRef);
  if (newDocSnapshot.exists()) {
    return mapDocToProject(newDocSnapshot);
  }
  throw new Error("Could not retrieve project after creation.");
};

export const updateProject = async (
  projectId: string,
  projectData: Partial<Project> // Project type has string dates for milestones
): Promise<Project | undefined> => {
  const projectDocRef = doc(db, "projects", projectId);
  const updateData: any = { ...projectData, updatedAt: serverTimestamp() };

  // Handle project-level dates
  if (projectData.hasOwnProperty('startDate')) {
    updateData.startDate = projectData.startDate ? Timestamp.fromDate(new Date(projectData.startDate)) : null;
  }
  if (projectData.hasOwnProperty('endDate')) {
    updateData.endDate = projectData.endDate ? Timestamp.fromDate(new Date(projectData.endDate)) : null;
  }
  if (projectData.hasOwnProperty('contactId') && projectData.contactId === undefined) {
      updateData.contactId = null;
  }
  if (projectData.hasOwnProperty('contactName') && projectData.contactName === undefined) {
      updateData.contactName = null;
  }

  if (projectData.milestones) {
    updateData.milestones = projectData.milestones.map(ms => {
      // ms is a Milestone object from the client, where dates are ISO strings or null
      const milestoneUpdate: any = {
        id: ms.id,
        name: ms.name,
        description: ms.description === undefined ? null : ms.description,
        completed: ms.completed,
        // Convert ISO string dates from client to Firestore Timestamps
        dueDate: ms.dueDate ? Timestamp.fromDate(new Date(ms.dueDate)) : null,
        // createdAt is an ISO string from client (either original from DB or new from client `now`)
        createdAt: Timestamp.fromDate(new Date(ms.createdAt)), 
        updatedAt: serverTimestamp(), // Always set/update updatedAt with serverTimestamp for any change
      };
      if (ms.description === undefined && milestoneUpdate.description === null) {
        delete milestoneUpdate.description; // Prefer omitting if it was truly undefined
      }
      return milestoneUpdate;
    });
  }

  await updateDoc(projectDocRef, updateData);
  const updatedDocSnapshot = await getDoc(projectDocRef);
  if (updatedDocSnapshot.exists()) {
    return mapDocToProject(updatedDocSnapshot);
  }
  return undefined;
};

export const deleteProject = async (projectId: string): Promise<boolean> => {
  const projectDocRef = doc(db, "projects", projectId);
  await deleteDoc(projectDocRef);
  return true;
};
