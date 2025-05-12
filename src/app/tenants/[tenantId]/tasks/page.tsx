// src/app/tenants/[tenantId]/tasks/page.tsx
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClipboardList, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TenantTasksPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <ClipboardList className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Aufgabenübersicht</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Aufgabenverwaltung</CardTitle>
          <CardDescription>Verwalten und verfolgen Sie alle Aufgaben für diesen Mandanten.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center py-12">
            <Construction className="h-16 w-16 text-primary mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              Diese Funktion ist in Kürze verfügbar.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Hier können Sie Aufgaben erstellen, Projekten zuweisen, den Status verfolgen und vieles mehr.
            </p>
            <img 
              src="https://picsum.photos/seed/tasksModule/1200/400" 
              alt="Symbolbild Aufgabenmanagement und Produktivität"
              data-ai-hint="tasks productivity"
              className="rounded-lg shadow-md w-full max-w-2xl object-cover h-64"
            />
            <Button asChild variant="outline" className="mt-8">
                <Link href={`/tenants/${tenantId}/projects`}>Zurück zur Projektübersicht</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
