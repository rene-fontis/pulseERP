export interface Tenant {
  id: string;
  name: string;
  createdAt: string; // Store as ISO string for simplicity, converted from Firestore Timestamp
}
