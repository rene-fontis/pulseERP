import type { Tenant } from '@/types';

// In-memory store for tenants
let tenants: Tenant[] = [
  { id: '1', name: 'Default Tenant Alpha', createdAt: new Date().toISOString() },
  { id: '2', name: 'Client Beta Services', createdAt: new Date().toISOString() },
  { id: '3', name: 'Gamma Solutions Inc.', createdAt: new Date().toISOString() },
];
let nextId = 4;

export const getTenants = async (): Promise<Tenant[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...tenants];
};

export const getTenantById = async (id: string): Promise<Tenant | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return tenants.find(tenant => tenant.id === id);
};

export const addTenant = async (name: string): Promise<Tenant> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newTenant: Tenant = {
    id: String(nextId++),
    name,
    createdAt: new Date().toISOString(),
  };
  tenants.push(newTenant);
  return newTenant;
};

export const updateTenant = async (id: string, name: string): Promise<Tenant | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const tenantIndex = tenants.findIndex(tenant => tenant.id === id);
  if (tenantIndex > -1) {
    tenants[tenantIndex] = { ...tenants[tenantIndex], name };
    return tenants[tenantIndex];
  }
  return undefined;
};

export const deleteTenant = async (id: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const initialLength = tenants.length;
  tenants = tenants.filter(tenant => tenant.id !== id);
  return tenants.length < initialLength;
};
