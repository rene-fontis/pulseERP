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
    startDate: data.startDate ? formatFirestoreTimestamp(data.startDate) : null,
    endDate: data.endDate ? formatFirestoreTimestamp(data.endDate) : null,
    status: data.status || 'Active',
    milestones: (data.milestones || []).map((ms: any) => ({
      ...ms,
      id: ms.id || crypto.randomUUID(),
      dueDate: ms.dueDate ? formatFirestoreTimestamp(ms.dueDate) : null,
      createdAt: ms.createdAt ? formatFirestoreTimestamp(ms.createdAt) : new Date(0).toISOString(),
      updatedAt: ms.updatedAt ? formatFirestoreTimestamp(ms.updatedAt) : new Date(0).toISOString(),
    })),
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, "now"),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, "now"),
  } as Project;
};

export const getProjects = async (tenantId: string, statusFilter?: ProjectStatus[]): Promise<Project[]> => {
  const qConstraints = [
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
    milestones: (projectData.milestones || []).map(ms => ({
        ...ms,
        id: crypto.randomUUID(),
        dueDate: ms.dueDate ? Timestamp.fromDate(new Date(ms.dueDate)) : null,
        createdAt: now,
        updatedAt: now,
    })),
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
  projectData: Partial<Project>
): Promise<Project | undefined> => {
  const projectDocRef = doc(db, "projects", projectId);
  const updateData: any = { ...projectData, updatedAt: serverTimestamp() };

  if (projectData.startDate) updateData.startDate = Timestamp.fromDate(new Date(projectData.startDate));
  if (projectData.endDate) updateData.endDate = Timestamp.fromDate(new Date(projectData.endDate));
  if (projectData.hasOwnProperty('contactId') && projectData.contactId === undefined) updateData.contactId = null;
  if (projectData.hasOwnProperty('contactName') && projectData.contactName === undefined) updateData.contactName = null;


  if (projectData.milestones) {
    updateData.milestones = projectData.milestones.map(ms => ({
        ...ms,
        dueDate: ms.dueDate ? Timestamp.fromDate(new Date(ms.dueDate)) : null,
        // Retain existing createdAt if not provided, or set if new
        createdAt: ms.createdAt ? (typeof ms.createdAt === 'string' ? Timestamp.fromDate(new Date(ms.createdAt)) : ms.createdAt) : serverTimestamp(),
        updatedAt: serverTimestamp()
    }));
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

// Milestone specific functions if milestones were a subcollection (not used for now)
// For now, milestones are updated as part of the project document.
// Example of how it would look if milestones were a subcollection:
/*
export const addMilestoneToProject = async (projectId: string, milestoneData: NewMilestonePayload): Promise<Milestone> => {
  const milestonesColRef = collection(db, "projects", projectId, "milestones");
  const now = serverTimestamp();
  const newMilestone = {
    ...milestoneData,
    dueDate: milestoneData.dueDate ? Timestamp.fromDate(new Date(milestoneData.dueDate)) : null,
    completed: milestoneData.completed || false,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(milestonesColRef, newMilestone);
  return { id: docRef.id, ...newMilestone } as Milestone; // simplified return for example
};
*/