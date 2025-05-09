// src/app/tenants/[tenantId]/dashboard/page.tsx
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, AlertCircle } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantDashboardPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error } = useGetTenantById(tenantId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-8 w-3/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden des Dashboards</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
        <p>Das Dashboard für den angeforderten Mandant konnte nicht geladen werden, da der Mandant nicht existiert.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Platzhalter Metrik 1</CardTitle>
                <CardDescription>Beschreibung für Metrik 1</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">123</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Platzhalter Metrik 2</CardTitle>
                <CardDescription>Beschreibung für Metrik 2</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">456</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Platzhalter Metrik 3</CardTitle>
                <CardDescription>Beschreibung für Metrik 3</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">789</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8">
             <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Weitere Informationen</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Dieser Bereich kann für Diagramme, Tabellen oder andere wichtige Informationen genutzt werden.</p>
                    <img src="https://picsum.photos/800/300" alt="Platzhalter Diagramm" data-ai-hint="chart graph" className="mt-4 rounded-md shadow-md"/>
                </CardContent>
             </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
