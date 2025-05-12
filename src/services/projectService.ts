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
import type { Project, Milestone, NewProjectPayload, NewMilestonePayload, ProjectStatus, ProjectTask } from "@/types";
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
      createdAt: formatFirestoreTimestamp(ms.createdAt, ms.id, 'now'), 
      updatedAt: formatFirestoreTimestamp(ms.updatedAt, ms.id, 'now'), 
    })),
    tasks: (data.tasks || []).map((task: any) => ({ // Map tasks
      ...task,
      id: task.id || crypto.randomUUID(),
      dueDate: task.dueDate ? formatFirestoreTimestamp(task.dueDate, task.id, 'now') : null,
      createdAt: formatFirestoreTimestamp(task.createdAt, task.id, 'now'),
      updatedAt: formatFirestoreTimestamp(task.updatedAt, task.id, 'now'),
    })),
    createdAt: formatFirestoreTimestamp(data.createdAt, docSnapshot.id, "now"),
    updatedAt: formatFirestoreTimestamp(data.updatedAt, docSnapshot.id, "now"),
  } as Project;
};

export const getProjects = async (tenantId: string, statusFilter?: ProjectStatus[]): Promise<Project[]> => {
  const qConstraints: any[] = [ 
    where("tenantId", "==", tenantId),
    orderBy("createdAt", "desc")
  ];
  // If statusFilter is provided and not empty, add the 'in' filter
  if (statusFilter && statusFilter.length > 0) {
    qConstraints.push(where("status", "in", statusFilter));
  }
  // If statusFilter is not provided or is empty, no status filter is applied, fetching all projects for the tenant.
  
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
  const clientGeneratedTimestamp = Timestamp.fromDate(new Date()); 
  const newProjectData: any = {
    ...projectData,
    tenantId,
    status: projectData.status || 'Active',
    milestones: (projectData.milestones || []).map(ms => {
      const milestoneToAdd: any = {
        id: crypto.randomUUID(),
        name: ms.name,
        description: ms.description === undefined ? null : ms.description,
        completed: ms.completed,
        dueDate: ms.dueDate ? Timestamp.fromDate(new Date(ms.dueDate)) : null,
        createdAt: clientGeneratedTimestamp, 
        updatedAt: clientGeneratedTimestamp, 
      };
      if (ms.description === undefined) {
          delete milestoneToAdd.description; 
      }
      return milestoneToAdd;
    }),
    tasks: (projectData.tasks || []).map(task => { // Initialize tasks array
        const taskToAdd: any = {
            id: crypto.randomUUID(),
            name: task.name,
            description: task.description === undefined ? null : task.description,
            milestoneId: task.milestoneId === undefined ? null : task.milestoneId,
            status: task.status || 'Open',
            dueDate: task.dueDate ? Timestamp.fromDate(new Date(task.dueDate)) : null,
            createdAt: clientGeneratedTimestamp,
            updatedAt: clientGeneratedTimestamp,
        };
        if (task.description === undefined) delete taskToAdd.description;
        if (task.milestoneId === undefined) delete taskToAdd.milestoneId;
        return taskToAdd;
    }),
    createdAt: serverTimestamp(), 
    updatedAt: serverTimestamp(), 
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
      const milestoneUpdate: any = {
        id: ms.id,
        name: ms.name,
        description: ms.description === undefined ? null : ms.description,
        completed: ms.completed,
        dueDate: ms.dueDate ? Timestamp.fromDate(new Date(ms.dueDate)) : null,
        // Firestore Timestamps for createdAt and updatedAt should generally not be client-overwritten on update
        // unless specifically intended. Typically, only `updatedAt` is set to serverTimestamp().
        // If createdAt is meant to be immutable, it shouldn't be in the update payload.
        // If it can change, it should also be converted to Timestamp.
        // For this example, assuming they are part of the payload:
        createdAt: Timestamp.fromDate(new Date(ms.createdAt)), 
        updatedAt: Timestamp.fromDate(new Date(ms.updatedAt)), 
      };
      if (ms.description === undefined && milestoneUpdate.description === null) {
        delete milestoneUpdate.description; 
      }
      return milestoneUpdate;
    });
  }

  if (projectData.tasks) { // Handle tasks update
    updateData.tasks = projectData.tasks.map(task => {
      const taskUpdate: any = {
        id: task.id,
        name: task.name,
        description: task.description === undefined ? null : task.description,
        milestoneId: task.milestoneId === undefined ? null : task.milestoneId,
        status: task.status,
        dueDate: task.dueDate ? Timestamp.fromDate(new Date(task.dueDate)) : null,
        createdAt: Timestamp.fromDate(new Date(task.createdAt)),
        updatedAt: Timestamp.fromDate(new Date(task.updatedAt)),
      };
       if (task.description === undefined && taskUpdate.description === null) delete taskUpdate.description;
       if (task.milestoneId === undefined && taskUpdate.milestoneId === null) delete taskUpdate.milestoneId;
      return taskUpdate;
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