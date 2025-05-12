// src/app/settings/users/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/services/userService';
import type { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Users as UsersIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function GlobalUsersPage() {
  const { data: users, isLoading, error } = useQuery<User[], Error>({
    queryKey: ['globalUsers'],
    queryFn: getUsers,
  });
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const formatDate = (dateString?: string) => {
    if (!clientLoaded || !dateString) return "Lädt...";
    try {
      // Assuming createdAt is already an ISO string from userService
      return format(new Date(dateString), "PPP p", { locale: de });
    } catch (e) {
      console.error("Error formatting date for user:", e);
      return "Ungültiges Datum";
    }
  };

  if (isLoading && !clientLoaded) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <UsersIcon className="h-8 w-8 mr-3 text-primary" />
          <Skeleton className="h-8 w-1/3" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-1/4 mb-1" />
            <Skeleton className="h-5 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-destructive">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Benutzer</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center mb-6">
        <UsersIcon className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Globale Benutzerverwaltung</h1>
      </div>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Alle Benutzer</CardTitle>
          <CardDescription>Übersicht aller registrierten Benutzer im System.</CardDescription>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Anzeigename</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead>Zugewiesene Mandanten (IDs)</TableHead>
                    {/* Aktionen Spalte kann später hinzugefügt werden */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.displayName || '-'}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>{user.tenantIds && user.tenantIds.length > 0 ? user.tenantIds.join(', ') : 'Keine'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-10 text-muted-foreground">
              Keine Benutzer gefunden.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
