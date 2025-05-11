
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getContacts,
  getContactById,
  addContact,
  updateContact,
  deleteContact,
} from "@/services/contactService";
import type { Contact, NewContactPayload } from "@/types";

const contactQueryKeys = {
  all: (tenantId: string) => ["contacts", tenantId] as const,
  lists: (tenantId: string) => [...contactQueryKeys.all(tenantId), "list"] as const,
  details: (tenantId: string) => [...contactQueryKeys.all(tenantId), "detail"] as const,
  detail: (contactId: string) => [...contactQueryKeys.details(""), contactId] as const, // TenantId might not be needed for specific detail if IDs are global
};

export function useGetContacts(tenantId: string | null) {
  return useQuery<Contact[], Error>({
    queryKey: contactQueryKeys.lists(tenantId!),
    queryFn: () => (tenantId ? getContacts(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  });
}

export function useGetContactById(contactId: string | null) {
  return useQuery<Contact | undefined, Error>({
    queryKey: contactQueryKeys.detail(contactId!),
    queryFn: () => (contactId ? getContactById(contactId) : Promise.resolve(undefined)),
    enabled: !!contactId,
  });
}

export function useAddContact() {
  const queryClient = useQueryClient();
  return useMutation<Contact, Error, NewContactPayload>({
    mutationFn: (contactData) => addContact(contactData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.lists(data.tenantId) });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation<
    Contact | undefined,
    Error,
    { contactId: string; data: Partial<NewContactPayload> }
  >({
    mutationFn: ({ contactId, data }) => updateContact(contactId, data),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: contactQueryKeys.lists(data.tenantId) });
        queryClient.invalidateQueries({ queryKey: contactQueryKeys.detail(variables.contactId) });
      }
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string, { previousContacts?: Contact[] }>({
    mutationFn: deleteContact,
    onSuccess: (success, contactId, context) => {
      if (success) {
        // Find the tenantId from the cache or context to invalidate correctly
        const allContactsCache = queryClient.getQueriesData<Contact[]>({ queryKey: ['contacts'] });
        let tenantIdToInvalidate: string | undefined;

        for (const [_key, contacts] of allContactsCache) {
            if (contacts) {
                const deletedContact = contacts.find(c => c.id === contactId);
                if (deletedContact) {
                    tenantIdToInvalidate = deletedContact.tenantId;
                    break;
                }
            }
        }
        if (tenantIdToInvalidate) {
            queryClient.invalidateQueries({ queryKey: contactQueryKeys.lists(tenantIdToInvalidate) });
        } else {
            queryClient.invalidateQueries({ queryKey: ['contacts'] }); // Fallback
        }
        queryClient.removeQueries({ queryKey: contactQueryKeys.detail(contactId) });
      }
    },
  });
}