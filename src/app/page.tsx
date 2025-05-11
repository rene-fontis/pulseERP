// src/app/page.tsx
"use client";

import React from 'react';
import { useGetTenants } from '@/hooks/useTenants';
import { HomePageTenantCard } from '@/components/dashboard/HomePageTenantCard';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function HomePage() {
  const { data: tenants, isLoading: isLoadingTenants, error: tenantsError } = useGetTenants();

  if (isLoadingTenants) {
    return (
      <div className="container mx-auto py-10">
        <div className="mb-8">
          <Skeleton className="h-10 w-1/2 mb-2" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (tenantsError) {
    return (
      <div className="container mx-auto py-10 flex flex-col items-center justify-center text-destructive">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Mandanten</h2>
        <p>{tenantsError.message}</p>
      </div>
    );
  }

  if (!tenants || tenants.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <LayoutDashboard className="h-10 w-10" />
            </div>
            <CardTitle className="text-3xl font-bold">Willkommen bei pulseERP</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Ihre optimierte Lösung für die Mandantenverwaltung.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-6">
              Es wurden noch keine Mandanten erstellt. Bitte legen Sie zuerst Mandanten an.
            </p>
            <img 
              src="https://picsum.photos/seed/homepage/1200/400" 
              alt="Abstrakte Darstellung von Daten und Analysen"
              data-ai-hint="abstract data analytics"
              className="mt-4 rounded-lg shadow-md w-full object-cover h-64"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <LayoutDashboard className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Mandantenübersicht</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Ein schneller Überblick über Ihre Mandanten.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map(tenant => (
          <HomePageTenantCard key={tenant.id} tenant={tenant} />
        ))}
      </div>
    </div>
  );
}