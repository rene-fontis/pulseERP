"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertCircle } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function TenantUsersPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error } = useGetTenantById(tenantId);

  if (isLoading) {
    return (
       <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/5" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Benutzerverwaltung</h2>
        <p>{error.message}</p>
      </div>
    );
  }
  
  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
        <p>Der angeforderte Mandant konnte nicht gefunden werden.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 px-4 md:px-0">
        <div className="flex items-center mb-2">
            <Users className="h-8 w-8 mr-3 text-primary" />
            <h1 className="text-2xl font-bold">Benutzerverwaltung: {tenant.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Verwalten Sie Benutzer und deren Berechtigungen für den Mandanten {tenant.name}.
        </p>
      </div>
      
      <Card className="shadow-lg mx-4 md:mx-0">
        <CardHeader>
          <CardTitle className="text-xl">Benutzerliste</CardTitle>
           <CardDescription>
            Fügen Sie Benutzer hinzu, bearbeiten oder entfernen Sie sie und weisen Sie Berechtigungen zu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-10 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 text-primary" />
            <p className="font-semibold">Funktion in Entwicklung</p>
            <p>Die Benutzerverwaltung befindet sich noch im Aufbau.</p>
            <p>Hier können Sie bald Benutzer hinzufügen und deren Zugriffsrechte für Module wie Buchhaltung definieren.</p>
          </div>
          <Button disabled className="bg-accent text-accent-foreground hover:bg-accent/90">Benutzer hinzufügen (Demnächst)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
