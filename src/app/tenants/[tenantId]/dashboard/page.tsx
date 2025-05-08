"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, AlertCircle, Users, DollarSign, ListChecks } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantDashboardPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error } = useGetTenantById(tenantId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Mandantendaten</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
        <p>Der angeforderte Mandant konnte nicht gefunden werden.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center mb-2">
            <LayoutDashboard className="h-8 w-8 mr-3 text-primary" />
            <CardTitle className="text-3xl font-bold">Dashboard: {tenant.name}</CardTitle>
          </div>
          <CardDescription className="text-lg">
            Übersicht und Kennzahlen für {tenant.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-medium">Aktive Benutzer</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">1.234</p>
                <p className="text-xs text-muted-foreground">+5,2% zum Vormonat</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-medium">Umsatz</CardTitle>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">56.789 €</p>
                <p className="text-xs text-muted-foreground">+12,8% zum Vormonat</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-medium">Letzte Aktivitäten</CardTitle>
                <ListChecks className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="text-sm">Benutzer Max Mustermann hat sich registriert.</li>
                  <li className="text-sm">Rechnung #INV-001 wurde bezahlt.</li>
                  <li className="text-sm">Neues Support-Ticket #TKT-102 wurde eröffnet.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
